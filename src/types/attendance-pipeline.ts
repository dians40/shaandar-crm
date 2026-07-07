/** Strict sequential pipeline stages — no skip allowed. */
export const PIPELINE_STAGES = {
  LAYER_2_STAGING: "LAYER_2_STAGING",
  LAYER_3_WORKFLOW: "LAYER_3_WORKFLOW",
  LAYER_4_SAVED: "LAYER_4_SAVED",
  /** Permanent archive after explicit Layer 4 persist/save — hidden from active L4 grid. */
  LAYER_4_ARCHIVED: "LAYER_4_ARCHIVED",
} as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[keyof typeof PIPELINE_STAGES];

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  PIPELINE_STAGES.LAYER_2_STAGING,
  PIPELINE_STAGES.LAYER_3_WORKFLOW,
  PIPELINE_STAGES.LAYER_4_SAVED,
  PIPELINE_STAGES.LAYER_4_ARCHIVED,
];

/** Allowed transitions — each stage may only advance to the next. */
export const ALLOWED_PIPELINE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  [PIPELINE_STAGES.LAYER_2_STAGING]: [PIPELINE_STAGES.LAYER_3_WORKFLOW],
  [PIPELINE_STAGES.LAYER_3_WORKFLOW]: [PIPELINE_STAGES.LAYER_4_SAVED],
  [PIPELINE_STAGES.LAYER_4_SAVED]: [PIPELINE_STAGES.LAYER_4_ARCHIVED],
  [PIPELINE_STAGES.LAYER_4_ARCHIVED]: [],
};

export function isPipelineStage(value: string): value is PipelineStage {
  return (
    value === PIPELINE_STAGES.LAYER_2_STAGING ||
    value === PIPELINE_STAGES.LAYER_3_WORKFLOW ||
    value === PIPELINE_STAGES.LAYER_4_SAVED ||
    value === PIPELINE_STAGES.LAYER_4_ARCHIVED
  );
}

export function assertPipelineTransition(from: PipelineStage, to: PipelineStage): void {
  const allowed = ALLOWED_PIPELINE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid pipeline transition: ${from} → ${to}. Records must move sequentially through all layers.`
    );
  }
}

export const INITIAL_INGEST_PIPELINE_STAGE = PIPELINE_STAGES.LAYER_2_STAGING;
