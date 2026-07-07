/** User management sequential pipeline stages — mirrors attendance pipeline tokens. */
export const USER_PIPELINE_STAGES = {
  LAYER_2_STAGING: "LAYER_2_STAGING",
  LAYER_3_WORKFLOW: "LAYER_3_WORKFLOW",
  LAYER_4_SAVED: "LAYER_4_SAVED",
} as const;

export type UserPipelineStage =
  (typeof USER_PIPELINE_STAGES)[keyof typeof USER_PIPELINE_STAGES];

export const USER_PIPELINE_STAGE_ORDER: UserPipelineStage[] = [
  USER_PIPELINE_STAGES.LAYER_2_STAGING,
  USER_PIPELINE_STAGES.LAYER_3_WORKFLOW,
  USER_PIPELINE_STAGES.LAYER_4_SAVED,
];

const ALLOWED_USER_TRANSITIONS: Record<UserPipelineStage, UserPipelineStage[]> = {
  [USER_PIPELINE_STAGES.LAYER_2_STAGING]: [USER_PIPELINE_STAGES.LAYER_3_WORKFLOW],
  [USER_PIPELINE_STAGES.LAYER_3_WORKFLOW]: [USER_PIPELINE_STAGES.LAYER_4_SAVED],
  [USER_PIPELINE_STAGES.LAYER_4_SAVED]: [],
};

export function isUserPipelineStage(value: string): value is UserPipelineStage {
  return (
    value === USER_PIPELINE_STAGES.LAYER_2_STAGING ||
    value === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW ||
    value === USER_PIPELINE_STAGES.LAYER_4_SAVED
  );
}

export function assertUserPipelineTransition(from: UserPipelineStage, to: UserPipelineStage): void {
  if (!ALLOWED_USER_TRANSITIONS[from]?.includes(to)) {
    throw new Error(
      `Invalid user pipeline transition: ${from} → ${to}. Users must move sequentially through all layers.`
    );
  }
}

export const INITIAL_USER_INGEST_STAGE = USER_PIPELINE_STAGES.LAYER_2_STAGING;

export const DEFAULT_SAVED_USER_STAGE = USER_PIPELINE_STAGES.LAYER_4_SAVED;
