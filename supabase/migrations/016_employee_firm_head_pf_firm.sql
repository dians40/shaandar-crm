-- ============================================================================
-- Shaandar CRM — Migration 016: Firm / head profile and PF active firm columns
-- ============================================================================
-- SAFE: Adds nullable columns; no data loss.
-- Adds: firm_head_profile, pf_firm
-- Run in Supabase SQL Editor OR via admin sync route when configured.
-- ============================================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS firm_head_profile TEXT,
  ADD COLUMN IF NOT EXISTS pf_firm TEXT;

COMMENT ON COLUMN public.employees.firm_head_profile IS
  'Firm or head profile assignment when ESI status is Active';

COMMENT ON COLUMN public.employees.pf_firm IS
  'PF active firm selection: Krishna Food Products | Mehak Industries';

NOTIFY pgrst, 'reload schema';
