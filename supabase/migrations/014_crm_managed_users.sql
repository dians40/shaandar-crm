-- CRM managed user credentials — permanent storage for User Management Layers 2–4.
-- Run in Supabase SQL Editor or apply via your migration workflow.

CREATE TABLE IF NOT EXISTS public.crm_managed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  otp_enabled BOOLEAN NOT NULL DEFAULT false,
  pipeline_stage TEXT NOT NULL DEFAULT 'LAYER_2_STAGING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_managed_users_username_key UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_crm_managed_users_pipeline_stage
  ON public.crm_managed_users (pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_crm_managed_users_username_lower
  ON public.crm_managed_users (lower(username));

COMMENT ON TABLE public.crm_managed_users IS
  'Shaandar CRM User Management credentials — Layer 2/3/4 intake accounts with role and pipeline stage tokens.';
