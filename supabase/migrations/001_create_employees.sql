-- Shaandar CRM — employees table + storage bucket
-- Run this in Supabase Dashboard → SQL Editor

-- ---------------------------------------------------------------------------
-- 1. Employees table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Basic Information
  full_name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  date_of_birth DATE NOT NULL,
  age INTEGER,
  mobile_number TEXT NOT NULL,
  alternative_mobile_number TEXT,
  full_address TEXT,
  pin_code TEXT,
  employee_type TEXT NOT NULL
    CHECK (employee_type IN ('Contractor', 'Regular', 'Temporary')),
  salary_basis TEXT,

  -- Work & Machine Assignment
  machine_assignment TEXT,

  -- Dynamic family members (JSONB array)
  -- [{ "id": "...", "fullName": "...", "relationship": "Mother", "esiRole": "..." }]
  family_members JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Document storage paths only (no Aadhaar/PAN numbers in plain text)
  -- { "aadhar": "employee-documents/<id>/aadhar.pdf", "pan": null, ... }
  document_paths JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Bank Details
  bank_account_number TEXT,
  ifsc_code TEXT,
  branch_name TEXT,

  -- Statutory Benefits
  esi_enabled BOOLEAN NOT NULL DEFAULT false,
  pf_enabled BOOLEAN NOT NULL DEFAULT false,
  fooding_allowance TEXT,

  -- Financial Tracker
  bonus_last_year NUMERIC(12, 2),
  extra_payment NUMERIC(12, 2),
  advance_paid NUMERIC(12, 2)
);

CREATE INDEX IF NOT EXISTS idx_employees_created_at
  ON public.employees (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employees_mobile_number
  ON public.employees (mobile_number);

CREATE INDEX IF NOT EXISTS idx_employees_employee_type
  ON public.employees (employee_type);

CREATE INDEX IF NOT EXISTS idx_employees_family_members
  ON public.employees USING gin (family_members);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employees_set_updated_at ON public.employees;
CREATE TRIGGER employees_set_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Row Level Security (RLS)
-- Service role (API routes) bypasses RLS.
-- Authenticated users get read/write when Supabase Auth is connected.
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read employees" ON public.employees;
CREATE POLICY "Authenticated users can read employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
CREATE POLICY "Authenticated users can insert employees"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
CREATE POLICY "Authenticated users can update employees"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. Storage bucket for employee documents (private — paths only in DB)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: service role uploads via API; authenticated read own org later
DROP POLICY IF EXISTS "Authenticated users can read employee documents" ON storage.objects;
CREATE POLICY "Authenticated users can read employee documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-documents');

DROP POLICY IF EXISTS "Authenticated users can upload employee documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload employee documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'employee-documents');
