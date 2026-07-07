-- Canonical public.biometric_attendance columns (idempotent sync with Prisma BiometricAttendance model).

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS srl_no INTEGER;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS card_no TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS duration TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS early_in TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS late_in TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS early_out TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS late_out TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS ot_hours TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS short_hours TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS gross_hours TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS net_hours TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS work_code TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS remark TEXT;

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS date TEXT;

-- Backfill canonical columns from legacy import columns when empty.
UPDATE public.biometric_attendance
SET
  srl_no = COALESCE(srl_no, NULLIF(regexp_replace(srl_number, '\D', '', 'g'), '')::INTEGER),
  card_no = COALESCE(NULLIF(card_no, ''), NULLIF(card_number, '')),
  duration = COALESCE(NULLIF(duration, ''), NULLIF(hours_worked, '')),
  early_in = COALESCE(NULLIF(early_in, ''), NULLIF(early_arrival, '')),
  late_in = COALESCE(NULLIF(late_in, ''), NULLIF(shift_late, '')),
  early_out = COALESCE(NULLIF(early_out, ''), NULLIF(shift_early, '')),
  late_out = COALESCE(NULLIF(late_out, ''), NULLIF(excess_lunch, '')),
  ot_hours = COALESCE(NULLIF(ot_hours, ''), NULLIF(ot, '')),
  short_hours = COALESCE(NULLIF(short_hours, ''), NULLIF(manual, '')),
  gross_hours = COALESCE(NULLIF(gross_hours, ''), NULLIF(hours_worked, '')),
  net_hours = COALESCE(NULLIF(net_hours, ''), NULLIF(hours_worked, '')),
  work_code = COALESCE(NULLIF(work_code, ''), NULLIF(shift, '')),
  remark = COALESCE(NULLIF(remark, ''), NULLIF(remarks, '')),
  date = COALESCE(NULLIF(date, ''), attendance_date::TEXT)
WHERE TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS biometric_attendance_pay_code_date_key
  ON public.biometric_attendance (pay_code, date)
  WHERE pay_code IS NOT NULL AND date IS NOT NULL AND pay_code <> '' AND date <> '';

COMMENT ON TABLE public.biometric_attendance IS
  'Canonical biometric attendance log — synced with Prisma BiometricAttendance model.';
