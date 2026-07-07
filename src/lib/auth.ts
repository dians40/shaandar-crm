import type { AuthSessionPayload } from "@/types/auth-session";

export const AUTH_COOKIE = "shaandar-auth";

/** Default Super Admin credentials for deployment testing. */
export const DEFAULT_ADMIN_CREDENTIALS = {
  username: "admin",
  password: "Shaandar@2026",
  fullName: "System Administrator",
  role: "Super Admin",
} as const;

export function validateAdminCredentials(username: string, password: string): boolean {
  const normalized = username.trim().toLowerCase();
  const acceptsIdentity =
    normalized === DEFAULT_ADMIN_CREDENTIALS.username ||
    normalized === "admin@shaandar.com";
  return acceptsIdentity && password === DEFAULT_ADMIN_CREDENTIALS.password;
}

export function buildAdminSession(): AuthSessionPayload {
  return {
    username: DEFAULT_ADMIN_CREDENTIALS.username,
    fullName: DEFAULT_ADMIN_CREDENTIALS.fullName,
    role: DEFAULT_ADMIN_CREDENTIALS.role,
    isAdmin: true,
  };
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
