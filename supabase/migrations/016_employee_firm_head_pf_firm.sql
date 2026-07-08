-- ============================================================================
-- Shaandar CRM — Migration 016: Firm group and PF active firm columns
-- ============================================================================
-- SAFE: Adds nullable columns; no data loss.
-- Adds: assigned_firm_group, pf_active_firm
-- Run in Supabase SQL Editor OR via admin sync route when configured.
-- ============================================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS assigned_firm_group TEXT,
  ADD COLUMN IF NOT EXISTS pf_active_firm TEXT;

COMMENT ON COLUMN public.employees.assigned_firm_group IS
  'Firm or head profile assignment when ESI status is Active';

COMMENT ON COLUMN public.employees.pf_active_firm IS
  'PF active firm selection: Krishna Food Products | Mehak Industries';

NOTIFY pgrst, 'reload schema';
