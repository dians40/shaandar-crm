import type { AuthSessionPayload } from "@/types/auth-session";
import type { UserRoleName } from "@/types/user-permissions";
import type { UserPipelineStage } from "@/types/user-pipeline";
import { DEFAULT_SAVED_USER_STAGE, USER_PIPELINE_STAGES } from "@/types/user-pipeline";

/** Role assigned to User Management Layer 2 intake accounts. */
export const LAYER_2_USER_ROLE = "LAYER_2" as const;

export function isLayer2UserRole(role: string): boolean {
  return role.trim().toUpperCase() === LAYER_2_USER_ROLE;
}

export type ManagedUserRecord = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  role: UserRoleName;
  otpEnabled: boolean;
  createdAt: string;
  pipelineStage?: UserPipelineStage;
};

export function resolveUserPipelineStage(user: ManagedUserRecord): UserPipelineStage {
  if (isLayer2UserRole(user.role)) {
    return USER_PIPELINE_STAGES.LAYER_2_STAGING;
  }
  return user.pipelineStage ?? DEFAULT_SAVED_USER_STAGE;
}

export function buildManagedUserAuthSession(user: ManagedUserRecord): AuthSessionPayload {
  return {
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    pipelineStage: resolveUserPipelineStage(user),
    isAdmin: false,
  };
}

export type ManagedUserFormState = {
  fullName: string;
  username: string;
  password: string;
  role: UserRoleName | "";
  otpEnabled: boolean;
};

export const EMPTY_MANAGED_USER_FORM: ManagedUserFormState = {
  fullName: "",
  username: "",
  password: "",
  role: "",
  otpEnabled: false,
};

export function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function validateManagedUserForm(form: ManagedUserFormState): string | null {
  if (!form.fullName.trim()) return "Full name is required.";
  if (!form.username.trim()) return "Username is required.";
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(form.username.trim())) {
    return "Username must be 3–32 characters (letters, numbers, . _ -).";
  }
  if (!form.password || form.password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!form.role) return "Select a role for this user.";
  return null;
}
