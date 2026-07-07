-- Idempotent attendance schema — employee_attendance + biometric_attendance.
-- Fixes PostgREST "Could not find table … in the schema cache" on bulk Excel import.
-- Run in Supabase SQL Editor or: npm run migrate:attendance

-- ---------------------------------------------------------------------------
-- 1. employee_attendance — workflow / manual attendance log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'half-day', 'leave')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_id
  ON public.employee_attendance (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_date
  ON public.employee_attendance (attendance_date);

COMMENT ON TABLE public.employee_attendance IS
  'Labor attendance workflow log — bulk Excel import upserts rows here.';

-- ---------------------------------------------------------------------------
-- 2. biometric_attendance — canonical 23-column Excel import grid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.biometric_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  srl_no INTEGER,
  pay_code TEXT,
  card_no TEXT,
  employee_name TEXT,
  department TEXT,
  designation TEXT,
  shift TEXT,
  date TEXT,
  status TEXT,
  in_time TEXT,
  out_time TEXT,
  duration TEXT,
  early_in TEXT,
  late_in TEXT,
  early_out TEXT,
  late_out TEXT,
  ot_hours TEXT,
  short_hours TEXT,
  gross_hours TEXT,
  net_hours TEXT,
  work_code TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync columns when table was created by older migrations (007–010).
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS srl_no INTEGER;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS pay_code TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS card_no TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS in_time TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS out_time TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS early_in TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS late_in TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS early_out TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS late_out TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS ot_hours TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS short_hours TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS gross_hours TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS net_hours TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS work_code TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.biometric_attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_biometric_attendance_pay_code
  ON public.biometric_attendance (pay_code);

CREATE INDEX IF NOT EXISTS idx_biometric_attendance_date_text
  ON public.biometric_attendance (date);

CREATE UNIQUE INDEX IF NOT EXISTS biometric_attendance_pay_code_date_key
  ON public.biometric_attendance (pay_code, date)
  WHERE pay_code IS NOT NULL AND date IS NOT NULL AND pay_code <> '' AND date <> '';

COMMENT ON TABLE public.biometric_attendance IS
  'Canonical biometric attendance log — synced with Prisma BiometricAttendance model.';

-- ---------------------------------------------------------------------------
-- 3. Row Level Security (service role bypasses RLS in API routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read employee_attendance" ON public.employee_attendance;
CREATE POLICY "Authenticated users can read employee_attendance"
  ON public.employee_attendance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can write employee_attendance" ON public.employee_attendance;
CREATE POLICY "Authenticated users can write employee_attendance"
  ON public.employee_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read biometric_attendance" ON public.biometric_attendance;
CREATE POLICY "Authenticated users can read biometric_attendance"
  ON public.biometric_attendance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can write biometric_attendance" ON public.biometric_attendance;
CREATE POLICY "Authenticated users can write biometric_attendance"
  ON public.biometric_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. PostgREST / API exposure
-- ---------------------------------------------------------------------------
GRANT ALL ON TABLE public.employee_attendance TO postgres, service_role;
GRANT ALL ON TABLE public.biometric_attendance TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_attendance TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.biometric_attendance TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5. Refresh PostgREST schema cache
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
