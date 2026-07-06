-- Add explicit date column for 23-column grid architecture (after shift).

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';

COMMENT ON COLUMN public.biometric_attendance.date IS
  'Explicit attendance date string from grid column 8 (injected from report title when Excel has 22 cols).';
