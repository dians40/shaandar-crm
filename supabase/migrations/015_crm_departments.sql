-- Dynamic Department Master — populated from attendance labour import processing.
CREATE TABLE IF NOT EXISTS public.crm_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_departments_name_key UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_crm_departments_name_lower
  ON public.crm_departments (lower(name));

COMMENT ON TABLE public.crm_departments IS
  'Shaandar CRM Department Master — auto-synced from attendance transactions and managed in General Settings.';
