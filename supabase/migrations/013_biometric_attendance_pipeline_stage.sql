-- Unified 4-layer sequential pipeline — pipeline_stage on biometric_attendance.
-- LAYER_2_STAGING → LAYER_3_WORKFLOW → LAYER_4_SAVED (strict, no skip)

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'LAYER_2_STAGING';

ALTER TABLE public.biometric_attendance
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'pending_allocation';

ALTER TABLE public.biometric_attendance
  DROP CONSTRAINT IF EXISTS biometric_attendance_pipeline_stage_check;

ALTER TABLE public.biometric_attendance
  ADD CONSTRAINT biometric_attendance_pipeline_stage_check
  CHECK (pipeline_stage IN ('LAYER_2_STAGING', 'LAYER_3_WORKFLOW', 'LAYER_4_SAVED'));

CREATE INDEX IF NOT EXISTS idx_biometric_attendance_pipeline_stage
  ON public.biometric_attendance (pipeline_stage);

COMMENT ON COLUMN public.biometric_attendance.pipeline_stage IS
  'Sequential pipeline layer: LAYER_2_STAGING → LAYER_3_WORKFLOW → LAYER_4_SAVED';

COMMENT ON COLUMN public.biometric_attendance.workflow_stage IS
  'Live workflow sub-stage when pipeline_stage = LAYER_3_WORKFLOW';

-- Legacy rows without stage (pre-migration uploads) remain in staging until approved.
UPDATE public.biometric_attendance
SET pipeline_stage = 'LAYER_2_STAGING'
WHERE pipeline_stage IS NULL OR pipeline_stage = '';

NOTIFY pgrst, 'reload schema';
