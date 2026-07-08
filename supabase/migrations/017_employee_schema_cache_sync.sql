-- ============================================================================
-- Shaandar CRM — Migration 017: Employee schema cache sync bundle
-- ============================================================================
-- One-shot script when PostgREST reports missing employee columns.
-- Combines migration 006 + 016 column additions and reloads API schema cache.
-- SAFE: ADD COLUMN IF NOT EXISTS only — no data loss.
-- ============================================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS assigned_firm TEXT,
  ADD COLUMN IF NOT EXISTS assigned_contractor TEXT,
  ADD COLUMN IF NOT EXISTS assigned_from_group TEXT,
  ADD COLUMN IF NOT EXISTS esi_status TEXT,
  ADD COLUMN IF NOT EXISTS pf_status TEXT,
  ADD COLUMN IF NOT EXISTS assigned_firm_group TEXT,
  ADD COLUMN IF NOT EXISTS pf_active_firm TEXT,
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate NUMERIC(12, 2);

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

COMMENT ON COLUMN public.employees.assigned_from_group IS
  'Unified firm or contractor group assignment';

COMMENT ON COLUMN public.employees.assigned_firm IS
  'Legacy firm assignment column (fallback when assigned_from_group unavailable)';

COMMENT ON COLUMN public.employees.assigned_contractor IS
  'Legacy contractor assignment column (fallback when assigned_from_group unavailable)';

COMMENT ON COLUMN public.employees.assigned_firm_group IS
  'Firm or head profile when ESI status is Active';

COMMENT ON COLUMN public.employees.pf_active_firm IS
  'PF active firm: Krishna Food Products | Mehak Industries';

COMMENT ON COLUMN public.employees.overtime_hourly_rate IS
  'Fixed overtime day-by-day payout amount (₹) used by Overtime Tracker';

NOTIFY pgrst, 'reload schema';
