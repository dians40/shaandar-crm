import { USER_PIPELINE_STAGES, type UserPipelineStage } from "@/types/user-pipeline";

export type AuthSessionPayload = {
  username: string;
  fullName: string;
  role: string;
  pipelineStage?: UserPipelineStage;
  isAdmin: boolean;
};

export const LAYER2_STAGING_WORKSPACE_MODULE = "attendance-system" as const;

export const LAYER2_STAGING_ALLOWED_PATH_PREFIXES = ["/transactions"] as const;

export function isLayer2StagingUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session || session.isAdmin) return false;
  return session.pipelineStage === USER_PIPELINE_STAGES.LAYER_2_STAGING;
}

export function isFullAccessUser(session: AuthSessionPayload | null | undefined): boolean {
  if (!session) return false;
  return session.isAdmin || !isLayer2StagingUser(session);
}
