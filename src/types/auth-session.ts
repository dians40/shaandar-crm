import {
  isLayer2UserRole,
  isLayer3UserRole,
  isLayer4UserRole,
} from "@/types/managed-user";
import { USER_PIPELINE_STAGES, type UserPipelineStage } from "@/types/user-pipeline";
import { PIPELINE_STAGES } from "@/types/attendance-pipeline";

export type AuthSessionPayload = {
  username: string;
  fullName: string;
  role: string;
  pipelineStage?: UserPipelineStage;
  isAdmin: boolean;
};

export type RestrictedAttendanceMode = "stagingOnly" | "workflowOnly" | "savedOnly";

export const LAYER2_STAGING_WORKSPACE_MODULE = "attendance-system" as const;

export const LAYER2_STAGING_ALLOWED_PATH_PREFIXES = ["/transactions"] as const;

/** API routes Layer 2 users may call (attendance staging workflow only). */
export const LAYER2_STAGING_ALLOWED_API_PATH_PREFIXES = [
  "/api/v1/attendance/pipeline",
  "/api/v1/attendance/staging",
  "/api/v1/attendance/schema/ensure",
  "/api/health/supabase",
] as const;

/** API routes Layer 3 users may call (live workflow only). */
export const LAYER3_WORKFLOW_ALLOWED_API_PATH_PREFIXES = [
  "/api/v1/attendance/pipeline",
  "/api/v1/attendance/schema/ensure",
  "/api/health/supabase",
] as const;

/** API routes Layer 4 users may call (saved history grid only). */
export const LAYER4_SAVED_ALLOWED_API_PATH_PREFIXES = [
  "/api/v1/attendance/biometric",
  "/api/v1/attendance/pipeline",
  "/api/v1/attendance/schema/ensure",
  "/api/health/supabase",
] as const;

/** Pipeline POST actions permitted for Layer 2 staging reviewers. */
export const LAYER2_STAGING_ALLOWED_PIPELINE_ACTIONS = [
  "approve-staging",
  "approve-all-staging",
  "update-department",
  "update-designation",
  "edit-staging-row",
  "reject-row",
  "reject-rows",
] as const;

/** Pipeline POST actions permitted for Layer 3 workflow operators. */
export const LAYER3_WORKFLOW_ALLOWED_PIPELINE_ACTIONS = [
  "commit-workflow",
  "commit-all-workflow",
  "update-department",
  "update-designation",
  "update-row-fields",
  "reject-row",
  "reject-rows",
] as const;

/** Pipeline POST actions permitted for Layer 4 saved-record operators. */
export const LAYER4_SAVED_ALLOWED_PIPELINE_ACTIONS = [
  "persist-saved-row",
  "persist-saved-rows",
  "reject-row",
  "reject-rows",
] as const;

/** Legacy staging POST actions permitted for Layer 2 staging reviewers. */
export const LAYER2_STAGING_ALLOWED_STAGING_ACTIONS = ["edit"] as const;

export const LAYER2_STAGING_PIPELINE_STAGE = PIPELINE_STAGES.LAYER_2_STAGING;
export const LAYER3_WORKFLOW_PIPELINE_STAGE = PIPELINE_STAGES.LAYER_3_WORKFLOW;
export const LAYER4_SAVED_PIPELINE_STAGE = PIPELINE_STAGES.LAYER_4_SAVED;

export function isLayer2StagingUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session || session.isAdmin) return false;
  return (
    session.pipelineStage === USER_PIPELINE_STAGES.LAYER_2_STAGING ||
    isLayer2UserRole(session.role)
  );
}

export function isLayer3WorkflowUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session || session.isAdmin) return false;
  return (
    session.pipelineStage === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW ||
    isLayer3UserRole(session.role)
  );
}

export function isLayer4SavedUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session || session.isAdmin) return false;
  return (
    session.pipelineStage === USER_PIPELINE_STAGES.LAYER_4_SAVED ||
    isLayer4UserRole(session.role)
  );
}

export function isRestrictedAttendanceUser(
  session: AuthSessionPayload | null | undefined
): boolean {
  return getRestrictedAttendanceMode(session) !== null;
}

export function getRestrictedAttendanceMode(
  session: AuthSessionPayload | null | undefined
): RestrictedAttendanceMode | null {
  if (!session || session.isAdmin) return null;
  if (isLayer2StagingUser(session)) return "stagingOnly";
  if (isLayer3WorkflowUser(session)) return "workflowOnly";
  if (isLayer4SavedUser(session)) return "savedOnly";
  return null;
}

export function isFullAccessUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session) return false;
  return session.isAdmin || !isRestrictedAttendanceUser(session);
}

export function isLayer2StagingPipelineAction(action: string): boolean {
  return (LAYER2_STAGING_ALLOWED_PIPELINE_ACTIONS as readonly string[]).includes(action);
}

export function isLayer3WorkflowPipelineAction(action: string): boolean {
  return (LAYER3_WORKFLOW_ALLOWED_PIPELINE_ACTIONS as readonly string[]).includes(action);
}

export function isLayer4SavedPipelineAction(action: string): boolean {
  return (LAYER4_SAVED_ALLOWED_PIPELINE_ACTIONS as readonly string[]).includes(action);
}

export function isLayer2StagingStagingAction(action: string): boolean {
  return (LAYER2_STAGING_ALLOWED_STAGING_ACTIONS as readonly string[]).includes(action);
}
