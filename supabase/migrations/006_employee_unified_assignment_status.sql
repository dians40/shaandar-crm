-- ============================================================================
-- Shaandar CRM — Migration 006: Unified assignment + statutory status columns
-- ============================================================================
-- SAFE: Preserves existing employee rows; backfills from legacy columns when present.
-- Adds: assigned_from_group, esi_status, pf_status
-- Run in Supabase SQL Editor OR: npm run migrate:employees
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. New unified columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS assigned_from_group TEXT,
  ADD COLUMN IF NOT EXISTS esi_status TEXT,
  ADD COLUMN IF NOT EXISTS pf_status TEXT;

-- Statutory status constraint (Active | Non-Active)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_esi_status_check'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_esi_status_check
      CHECK (esi_status IS NULL OR esi_status IN ('Active', 'Non-Active'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_pf_status_check'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_pf_status_check
      CHECK (pf_status IS NULL OR pf_status IN ('Active', 'Non-Active'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Backfill assigned_from_group from legacy firm / contractor columns
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'assigned_firm'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'assigned_contractor'
  ) THEN
    UPDATE public.employees
    SET assigned_from_group = COALESCE(
      NULLIF(TRIM(assigned_firm), ''),
      NULLIF(TRIM(assigned_contractor), '')
    )
    WHERE assigned_from_group IS NULL
      AND (
        NULLIF(TRIM(assigned_firm), '') IS NOT NULL
        OR NULLIF(TRIM(assigned_contractor), '') IS NOT NULL
      );
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'assigned_firm'
  ) THEN
    UPDATE public.employees
    SET assigned_from_group = NULLIF(TRIM(assigned_firm), '')
    WHERE assigned_from_group IS NULL
      AND NULLIF(TRIM(assigned_firm), '') IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Backfill esi_status / pf_status from legacy boolean flags
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'esi_enabled'
  ) THEN
    UPDATE public.employees
    SET esi_status = CASE WHEN esi_enabled THEN 'Active' ELSE 'Non-Active' END
    WHERE esi_status IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'pf_enabled'
  ) THEN
    UPDATE public.employees
    SET pf_status = CASE WHEN pf_enabled THEN 'Active' ELSE 'Non-Active' END
    WHERE pf_status IS NULL;
  END IF;
END $$;

-- Default any remaining nulls for new columns
UPDATE public.employees
SET esi_status = COALESCE(esi_status, 'Non-Active')
WHERE esi_status IS NULL;

UPDATE public.employees
SET pf_status = COALESCE(pf_status, 'Non-Active')
WHERE pf_status IS NULL;

-- Keep legacy booleans in sync for any older readers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'esi_enabled'
  ) THEN
    UPDATE public.employees
    SET esi_enabled = (esi_status = 'Active')
    WHERE esi_status IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
      AND column_name = 'pf_enabled'
  ) THEN
    UPDATE public.employees
    SET pf_enabled = (pf_status = 'Active')
    WHERE pf_status IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Documentation & index
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_assigned_from_group
  ON public.employees (assigned_from_group)
  WHERE assigned_from_group IS NOT NULL;

COMMENT ON COLUMN public.employees.assigned_from_group IS
  'Unified firm or contractor group — Krishna Food Product, MAHEK Industries, or contractor name';

COMMENT ON COLUMN public.employees.esi_status IS
  'ESI payroll status: Active | Non-Active (Non-Active = zero ESI deduction)';

COMMENT ON COLUMN public.employees.pf_status IS
  'PF payroll status: Active | Non-Active (Non-Active = zero PF deduction)';

-- ---------------------------------------------------------------------------
-- 5. Refresh PostgREST schema cache (fixes "column not in schema cache" errors)
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
