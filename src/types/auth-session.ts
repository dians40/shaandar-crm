import { USER_PIPELINE_STAGES, type UserPipelineStage } from "@/types/user-pipeline";
import { PIPELINE_STAGES } from "@/types/attendance-pipeline";

export type AuthSessionPayload = {
  username: string;
  fullName: string;
  role: string;
  pipelineStage?: UserPipelineStage;
  isAdmin: boolean;
};

export const LAYER2_STAGING_WORKSPACE_MODULE = "attendance-system" as const;

export const LAYER2_STAGING_ALLOWED_PATH_PREFIXES = ["/transactions"] as const;

/** API routes Layer 2 users may call (attendance staging workflow only). */
export const LAYER2_STAGING_ALLOWED_API_PATH_PREFIXES = [
  "/api/v1/attendance/pipeline",
  "/api/v1/attendance/staging",
  "/api/v1/attendance/schema/ensure",
  "/api/health/supabase",
] as const;

/** Pipeline POST actions permitted for Layer 2 staging reviewers. */
export const LAYER2_STAGING_ALLOWED_PIPELINE_ACTIONS = [
  "approve-staging",
  "approve-all-staging",
  "update-department",
  "update-designation",
] as const;

/** Legacy staging POST actions permitted for Layer 2 staging reviewers. */
export const LAYER2_STAGING_ALLOWED_STAGING_ACTIONS = ["edit"] as const;

export const LAYER2_STAGING_PIPELINE_STAGE = PIPELINE_STAGES.LAYER_2_STAGING;

export function isLayer2StagingUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session || session.isAdmin) return false;
  return session.pipelineStage === USER_PIPELINE_STAGES.LAYER_2_STAGING;
}

export function isFullAccessUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session) return false;
  return session.isAdmin || !isLayer2StagingUser(session);
}

export function isLayer2StagingPipelineAction(action: string): boolean {
  return (LAYER2_STAGING_ALLOWED_PIPELINE_ACTIONS as readonly string[]).includes(action);
}

export function isLayer2StagingStagingAction(action: string): boolean {
  return (LAYER2_STAGING_ALLOWED_STAGING_ACTIONS as readonly string[]).includes(action);
}
