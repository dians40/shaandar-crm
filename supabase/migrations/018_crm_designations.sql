-- Dynamic Designation Master — managed in General Settings.
CREATE TABLE IF NOT EXISTS public.crm_designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_designations_name_key UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_crm_designations_name_lower
  ON public.crm_designations (lower(name));

COMMENT ON TABLE public.crm_designations IS
  'Shaandar CRM Designation Master — pre-seeded and editable in General Settings.';

NOTIFY pgrst, 'reload schema';
