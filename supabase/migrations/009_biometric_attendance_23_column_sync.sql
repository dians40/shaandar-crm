-- Idempotent sync: biometric_attendance 23-column grid architecture.
-- Run after 007 + 008 if bulk import reports schema/relation mismatch on date.

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';

ALTER TABLE public.biometric_attendance
  ALTER COLUMN date SET DEFAULT '';

UPDATE public.biometric_attendance
SET date = COALESCE(NULLIF(date, ''), attendance_date::TEXT)
WHERE date IS NULL OR date = '';

COMMENT ON TABLE public.biometric_attendance IS
  'Structured 23-column biometric Daily Performance import log (includes explicit date column).';

COMMENT ON COLUMN public.biometric_attendance.date IS
  'Explicit attendance date string from grid column 8 (injected from report title when Excel has 22 cols).';
