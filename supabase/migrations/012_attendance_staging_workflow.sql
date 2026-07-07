-- Biometric attendance staging workflow — draft, audit, master transfer.
-- Step 1–5: staging → review → approve → evening upsert → employee_attendance

-- ---------------------------------------------------------------------------
-- 1. attendance_staging — draft / review (Pending | Approved)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  pay_code TEXT NOT NULL,
  employee_name TEXT,
  date DATE NOT NULL,
  shift_date DATE NOT NULL,
  machine_in_time TIMESTAMPTZ,
  machine_out_time TIMESTAMPTZ,
  corrected_in_time TIMESTAMPTZ,
  corrected_out_time TIMESTAMPTZ,
  duration TEXT,
  ot_hours TEXT,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved')),
  is_anomaly BOOLEAN NOT NULL DEFAULT false,
  anomaly_reason TEXT,
  edit_remark TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pay_code, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_staging_shift_date
  ON public.attendance_staging (shift_date);

CREATE INDEX IF NOT EXISTS idx_attendance_staging_status
  ON public.attendance_staging (status);

CREATE INDEX IF NOT EXISTS idx_attendance_staging_pay_code
  ON public.attendance_staging (pay_code);

-- ---------------------------------------------------------------------------
-- 2. attendance_audit_log — every edit / approve action
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_id UUID NOT NULL REFERENCES public.attendance_staging(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  change_type TEXT NOT NULL
    CHECK (change_type IN ('Edit', 'Approve', 'Bulk Approve', 'Upload', 'Upsert', 'Transfer')),
  old_value JSONB,
  new_value JSONB,
  remark TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_log_staging_id
  ON public.attendance_audit_log (staging_id);

-- ---------------------------------------------------------------------------
-- 3. employee_attendance — extend master table for payroll final data
-- ---------------------------------------------------------------------------
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS pay_code TEXT;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS final_in_time TIMESTAMPTZ;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS final_out_time TIMESTAMPTZ;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS net_hours TEXT;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS ot_hours TEXT;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.employee_attendance ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employee_attendance_pay_code
  ON public.employee_attendance (pay_code);

-- RLS + grants (service role bypasses; anon read blocked by default)
ALTER TABLE public.attendance_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance_staging' AND policyname = 'service_role_all_staging'
  ) THEN
    CREATE POLICY service_role_all_staging ON public.attendance_staging
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance_audit_log' AND policyname = 'service_role_all_audit'
  ) THEN
    CREATE POLICY service_role_all_audit ON public.attendance_audit_log
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.attendance_staging TO service_role;
GRANT ALL ON public.attendance_audit_log TO service_role;

NOTIFY pgrst, 'reload schema';
