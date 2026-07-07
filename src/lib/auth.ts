import type { AuthSessionPayload } from "@/types/auth-session";
import { LAYER_2_USER_ROLE } from "@/types/managed-user";
import { USER_PIPELINE_STAGES } from "@/types/user-pipeline";

export const AUTH_COOKIE = "shaandar-auth";

/** Default Super Admin credentials for deployment testing. */
export const DEFAULT_ADMIN_CREDENTIALS = {
  username: "admin",
  password: "Shaandar@2026",
  fullName: "System Administrator",
  role: "Super Admin",
} as const;

/** Hardcoded emergency recovery bypass — no database lookup. */
export const EMERGENCY_ADMIN_BYPASS = {
  username: "admin@shaandarcrm.com",
  password: "ShaandarAdmin@2026",
  fullName: "Emergency Administrator",
  role: "Super Admin",
} as const;

/** Hardcoded Layer 2 staging bypass for Sanjeev — no database lookup required. */
export const SANJEEV_LAYER2_BYPASS = {
  username: "sanjeev",
  hindiUsername: "संजीव",
  password: "abcd@1234",
  fullName: "Sanjeev",
  role: LAYER_2_USER_ROLE,
  pipelineStage: USER_PIPELINE_STAGES.LAYER_2_STAGING,
} as const;

export function isSanjeevLayer2Username(username: string): boolean {
  const trimmed = username.trim();
  if (trimmed.toLowerCase() === SANJEEV_LAYER2_BYPASS.username) {
    return true;
  }
  return trimmed === SANJEEV_LAYER2_BYPASS.hindiUsername;
}

export function isSanjeevLayer2Bypass(username: string, password: string): boolean {
  return isSanjeevLayer2Username(username) && password === SANJEEV_LAYER2_BYPASS.password;
}

export function buildSanjeevLayer2Session(): AuthSessionPayload {
  return {
    username: SANJEEV_LAYER2_BYPASS.username,
    fullName: SANJEEV_LAYER2_BYPASS.fullName,
    role: SANJEEV_LAYER2_BYPASS.role,
    pipelineStage: SANJEEV_LAYER2_BYPASS.pipelineStage,
    isAdmin: false,
  };
}

export function resolveSanjeevLayer2Session(
  username: string,
  password: string
): AuthSessionPayload | null {
  if (isSanjeevLayer2Bypass(username, password)) {
    return buildSanjeevLayer2Session();
  }
  return null;
}

export function isEmergencyAdminBypass(username: string, password: string): boolean {
  const normalized = username.trim().toLowerCase();
  return (
    normalized === EMERGENCY_ADMIN_BYPASS.username.toLowerCase() &&
    password === EMERGENCY_ADMIN_BYPASS.password
  );
}

export function buildAdminSession(): AuthSessionPayload {
  return {
    username: DEFAULT_ADMIN_CREDENTIALS.username,
    fullName: DEFAULT_ADMIN_CREDENTIALS.fullName,
    role: DEFAULT_ADMIN_CREDENTIALS.role,
    isAdmin: true,
  };
}

export function buildEmergencyAdminSession(): AuthSessionPayload {
  return {
    username: EMERGENCY_ADMIN_BYPASS.username,
    fullName: EMERGENCY_ADMIN_BYPASS.fullName,
    role: EMERGENCY_ADMIN_BYPASS.role,
    isAdmin: true,
  };
}

/** Resolve Super Admin session from credentials; emergency bypass checked first. */
export function resolveAdminSession(
  username: string,
  password: string
): AuthSessionPayload | null {
  if (isEmergencyAdminBypass(username, password)) {
    return buildEmergencyAdminSession();
  }

  const normalized = username.trim().toLowerCase();
  const acceptsIdentity =
    normalized === DEFAULT_ADMIN_CREDENTIALS.username ||
    normalized === "admin@shaandar.com";
  if (acceptsIdentity && password === DEFAULT_ADMIN_CREDENTIALS.password) {
    return buildAdminSession();
  }

  return null;
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return resolveAdminSession(username, password) !== null;
}

export function encodeAuthSession(session: AuthSessionPayload): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

export function decodeAuthSession(raw: string | undefined | null): AuthSessionPayload | null {
  if (!raw || raw === "true") return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf-8")
    ) as AuthSessionPayload;
    if (!parsed?.username || !parsed?.role || typeof parsed.isAdmin !== "boolean") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isAuthenticatedSession(raw: string | undefined | null): boolean {
  return decodeAuthSession(raw) !== null;
}
