/** Overtime approval pipeline — separate from attendance pipeline_stage tokens. */
export const OVERTIME_PIPELINE_STAGES = {
  LAYER_2_STAGING: "LAYER_2_STAGING",
  LAYER_3_WORKFLOW: "LAYER_3_WORKFLOW",
  LAYER_4_SAVED: "LAYER_4_SAVED",
} as const;

export type OvertimePipelineStage =
  (typeof OVERTIME_PIPELINE_STAGES)[keyof typeof OVERTIME_PIPELINE_STAGES];

export const OVERTIME_PIPELINE_STAGE_LABELS: Record<OvertimePipelineStage, string> = {
  LAYER_2_STAGING: "Layer 2 — Overtime Staging Review",
  LAYER_3_WORKFLOW: "Layer 3 — Overtime Workflow Verification",
  LAYER_4_SAVED: "Layer 4 — Overtime Saved / Ledger Commit",
};

export function isOvertimePipelineStage(value: string): value is OvertimePipelineStage {
  return Object.values(OVERTIME_PIPELINE_STAGES).includes(value as OvertimePipelineStage);
}

export function assertOvertimePipelineTransition(from: OvertimePipelineStage, to: OvertimePipelineStage) {
  if (from === OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING && to === OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW) {
    return;
  }
  if (from === OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW && to === OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED) {
    return;
  }
  throw new Error(`Invalid overtime pipeline transition: ${from} → ${to}`);
}
