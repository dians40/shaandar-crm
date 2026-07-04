-- Attendance records — protects employees from deletion once marked present/absent.
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half-day', 'leave')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_id
  ON public.employee_attendance (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_date
  ON public.employee_attendance (attendance_date);

COMMENT ON TABLE public.employee_attendance IS
  'Labor attendance log. Employees with rows here cannot be deleted (FK RESTRICT + API guard).';
