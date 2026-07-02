-- ============================================================================
-- Shaandar CRM — Migration 003: Extended Employee Fields (Final)
-- ============================================================================
-- PREREQUISITE: Run 001_create_employees.sql and 002_employee_enhancements.sql first.
-- WHERE:  Supabase Dashboard → SQL Editor → New query → Run
-- SAFE:   Uses IF NOT EXISTS — safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Personal, vehicle & reference columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
  ADD COLUMN IF NOT EXISTS joining_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS police_station TEXT,
  ADD COLUMN IF NOT EXISTS reference_name TEXT,
  ADD COLUMN IF NOT EXISTS reference_mobile TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Gender constraint (add only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_gender_check'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_gender_check
      CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Document ID numbers — plain TEXT columns (Aadhaar number NOT stored)
--    Aadhaar file path stays in document_paths JSONB -> 'aadhar' key only.
--    pf_number & esi_number may already exist from migration 002.
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS pf_number TEXT,
  ADD COLUMN IF NOT EXISTS esi_number TEXT,
  ADD COLUMN IF NOT EXISTS voter_id_number TEXT,
  ADD COLUMN IF NOT EXISTS ration_card_number TEXT,
  ADD COLUMN IF NOT EXISTS driving_license_number TEXT;

-- ---------------------------------------------------------------------------
-- 3. Salary: basic + auto-calculated allowances (JSONB) + contract packing
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS allowances JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contract_packing JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 4. Backfill from earlier 003 draft columns (if you ran an older version)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'police_station_name'
  ) THEN
    UPDATE public.employees
    SET police_station = police_station_name
    WHERE police_station IS NULL AND police_station_name IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'reference_from_name'
  ) THEN
    UPDATE public.employees
    SET reference_name = reference_from_name
    WHERE reference_name IS NULL AND reference_from_name IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'reference_mobile_number'
  ) THEN
    UPDATE public.employees
    SET reference_mobile = reference_mobile_number
    WHERE reference_mobile IS NULL AND reference_mobile_number IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'document_numbers'
  ) THEN
    UPDATE public.employees
    SET
      pan_number = COALESCE(pan_number, document_numbers->>'pan'),
      pf_number = COALESCE(pf_number, document_numbers->>'pf'),
      esi_number = COALESCE(esi_number, document_numbers->>'esi'),
      voter_id_number = COALESCE(voter_id_number, document_numbers->>'voterId'),
      ration_card_number = COALESCE(ration_card_number, document_numbers->>'rationCard'),
      driving_license_number = COALESCE(driving_license_number, document_numbers->>'drivingLicense')
    WHERE document_numbers IS NOT NULL AND document_numbers <> '{}'::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'document_paths'
  ) THEN
    UPDATE public.employees
    SET photo_url = COALESCE(photo_url, document_paths->>'profilePhoto')
    WHERE photo_url IS NULL
      AND document_paths IS NOT NULL
      AND document_paths ? 'profilePhoto';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Indexes & documentation
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_vehicle_number
  ON public.employees (vehicle_number)
  WHERE vehicle_number IS NOT NULL;

COMMENT ON COLUMN public.employees.vehicle_number IS 'Vehicle registration — driver/labor tracking';
COMMENT ON COLUMN public.employees.joining_date IS 'Date employee joined';
COMMENT ON COLUMN public.employees.gender IS 'Male | Female | Other';
COMMENT ON COLUMN public.employees.police_station IS 'Nearest police station name';
COMMENT ON COLUMN public.employees.reference_name IS 'Reference person full name';
COMMENT ON COLUMN public.employees.reference_mobile IS 'Reference person 10-digit mobile';
COMMENT ON COLUMN public.employees.photo_url IS 'Profile photo storage path/URL (Supabase Storage)';
COMMENT ON COLUMN public.employees.pan_number IS 'PAN card number (plain text)';
COMMENT ON COLUMN public.employees.pf_number IS 'PF / UAN number (plain text)';
COMMENT ON COLUMN public.employees.esi_number IS 'ESI registration number (plain text)';
COMMENT ON COLUMN public.employees.voter_id_number IS 'Voter ID number (plain text)';
COMMENT ON COLUMN public.employees.ration_card_number IS 'Ration card number (plain text)';
COMMENT ON COLUMN public.employees.driving_license_number IS 'Driving license number (plain text)';
COMMENT ON COLUMN public.employees.document_paths IS
  'File storage paths JSON — aadhar, pan, esi, pf, etc. Aadhaar NUMBER never stored here.';
COMMENT ON COLUMN public.employees.basic_salary IS 'Basic salary — base for allowance & PF calculation';
COMMENT ON COLUMN public.employees.allowances IS
  'JSON: { basicSalary, conveyance, hra, tea, washing, grossWithAllowances }';
COMMENT ON COLUMN public.employees.contract_packing IS
  'JSON Column 6: { itemName, minimumOutput, quantityProduced, ratePerPiece, totalEarned }';

-- ============================================================================
-- VERIFY — run after migration (expect 16 rows)
-- ============================================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'employees'
--   AND column_name IN (
--     'vehicle_number', 'joining_date', 'gender', 'police_station',
--     'reference_name', 'reference_mobile', 'photo_url',
--     'pan_number', 'pf_number', 'esi_number', 'voter_id_number',
--     'ration_card_number', 'driving_license_number',
--     'basic_salary', 'allowances', 'contract_packing'
--   )
-- ORDER BY column_name;

-- ============================================================================
-- VERIFY DATA — run after form submit
-- ============================================================================
-- SELECT
--   full_name,
--   vehicle_number,
--   gender,
--   police_station,
--   reference_name,
--   reference_mobile,
--   joining_date,
--   photo_url,
--   employee_type,
--   salary_basis,
--   machine_assignment,
--   basic_salary,
--   allowances,
--   contract_packing,
--   pan_number,
--   pf_number,
--   esi_number,
--   voter_id_number,
--   ration_card_number,
--   document_paths->>'aadhar' AS aadhar_file_path
-- FROM public.employees
-- ORDER BY created_at DESC
-- LIMIT 3;
