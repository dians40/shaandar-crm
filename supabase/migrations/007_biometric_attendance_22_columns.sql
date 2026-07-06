-- Biometric attendance — explicit 23-column structure for Excel bulk import.
-- Matches prisma/schema.prisma → Attendance model.

CREATE TABLE IF NOT EXISTS public.biometric_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  attendance_date DATE,

  srl_number TEXT DEFAULT '',
  pay_code TEXT DEFAULT '',
  card_number TEXT DEFAULT '',
  employee_name TEXT DEFAULT '',
  department TEXT DEFAULT '',
  designation TEXT DEFAULT '',
  shift TEXT DEFAULT '',
  date TEXT DEFAULT '',
  start TEXT DEFAULT '',
  in_time TEXT DEFAULT '',
  lunch_out TEXT DEFAULT '',
  lunch_in TEXT DEFAULT '',
  out_time TEXT DEFAULT '',
  hours_worked TEXT DEFAULT '',
  status TEXT DEFAULT '',
  early_arrival TEXT DEFAULT '',
  shift_late TEXT DEFAULT '',
  shift_early TEXT DEFAULT '',
  excess_lunch TEXT DEFAULT '',
  ot TEXT DEFAULT '',
  overtime TEXT DEFAULT '',
  overstay TEXT DEFAULT '',
  manual TEXT DEFAULT '',

  punch_in TEXT DEFAULT '',
  punch_out TEXT DEFAULT '',
  remarks TEXT DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_biometric_attendance_pay_code
  ON public.biometric_attendance (pay_code);

CREATE INDEX IF NOT EXISTS idx_biometric_attendance_date
  ON public.biometric_attendance (attendance_date);

CREATE INDEX IF NOT EXISTS idx_biometric_attendance_employee_id
  ON public.biometric_attendance (employee_id);

DROP TRIGGER IF EXISTS biometric_attendance_set_updated_at ON public.biometric_attendance;
CREATE TRIGGER biometric_attendance_set_updated_at
  BEFORE UPDATE ON public.biometric_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.biometric_attendance IS
  'Structured 23-column biometric Daily Performance import log aligned with Excel export.';
