-- Shaandar CRM — Employee Management enhancements
-- Run in Supabase SQL Editor after 001_create_employees.sql

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS fix_salary_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS variable_salary_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS worked_days NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS esi_number TEXT,
  ADD COLUMN IF NOT EXISTS pf_number TEXT;

-- Fooding options may change; column stays TEXT
COMMENT ON COLUMN public.employees.esi_number IS 'ESI registration number for payroll';
COMMENT ON COLUMN public.employees.pf_number IS 'PF/UAN number for payroll';
COMMENT ON COLUMN public.employees.document_paths IS 'Storage paths only — rationCard, voterId, otherDocuments included';

-- Allow authenticated delete (for Edit/Remove feature)
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON public.employees;
CREATE POLICY "Authenticated users can delete employees"
  ON public.employees FOR DELETE
  TO authenticated
  USING (true);
