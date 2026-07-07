import type { ManagedUserRecord } from "@/types/managed-user";

export const MANAGED_USERS_STORAGE_KEY = "shaandar-crm-managed-users";

export function readManagedUsers(): ManagedUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MANAGED_USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ManagedUserRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeManagedUsers(users: ManagedUserRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MANAGED_USERS_STORAGE_KEY, JSON.stringify(users));
}

function commitManagedUsers(users: ManagedUserRecord[]): ManagedUserRecord[] {
  writeManagedUsers(users);
  void syncManagedUsersToServer(users);
  return users;
}

export async function fetchManagedUsersFromServer(): Promise<ManagedUserRecord[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/v1/managed-users", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { users?: ManagedUserRecord[] };
    return Array.isArray(payload.users) ? payload.users : null;
  } catch {
    return null;
  }
}

export async function syncManagedUsersToServer(users: ManagedUserRecord[]): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/v1/managed-users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users }),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { users?: ManagedUserRecord[] };
    if (Array.isArray(payload.users)) {
      writeManagedUsers(payload.users);
    }
    return true;
  } catch {
    return false;
  }
}

export async function upsertManagedUserOnServer(
  user: ManagedUserRecord
): Promise<{ ok: boolean; users: ManagedUserRecord[] }> {
  if (typeof window === "undefined") {
    return { ok: false, users: [] };
  }
  try {
    const response = await fetch("/api/v1/managed-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    });
    if (!response.ok) {
      return { ok: false, users: readManagedUsers() };
    }
    const payload = (await response.json()) as { users?: ManagedUserRecord[] };
    const users = Array.isArray(payload.users) ? payload.users : readManagedUsers();
    writeManagedUsers(users);
    return { ok: true, users };
  } catch {
    return { ok: false, users: readManagedUsers() };
  }
}

export async function deleteManagedUserOnServer(
  userId: string
): Promise<{ ok: boolean; users: ManagedUserRecord[] }> {
  if (typeof window === "undefined") {
    return { ok: false, users: [] };
  }
  try {
    const response = await fetch(
      `/api/v1/managed-users?id=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      return { ok: false, users: readManagedUsers() };
    }
    const payload = (await response.json()) as { users?: ManagedUserRecord[] };
    const users = Array.isArray(payload.users) ? payload.users : readManagedUsers();
    writeManagedUsers(users);
    return { ok: true, users };
  } catch {
    return { ok: false, users: readManagedUsers() };
  }
}

export function upsertManagedUser(user: ManagedUserRecord): ManagedUserRecord[] {
  return commitManagedUsers([user, ...readManagedUsers().filter((row) => row.id !== user.id)]);
}

export function deleteManagedUser(userId: string): ManagedUserRecord[] {
  return commitManagedUsers(readManagedUsers().filter((row) => row.id !== userId));
}

export function updateManagedUser(
  userId: string,
  patch: Partial<
    Pick<ManagedUserRecord, "otpEnabled" | "password" | "role" | "fullName" | "username" | "pipelineStage">
  >
): ManagedUserRecord[] {
  return commitManagedUsers(
    readManagedUsers().map((row) => (row.id === userId ? { ...row, ...patch } : row))
  );
}

export function renameRoleInManagedUsers(oldRole: string, newRole: string): ManagedUserRecord[] {
  return commitManagedUsers(
    readManagedUsers().map((row) => (row.role === oldRole ? { ...row, role: newRole } : row))
  );
}

export function reassignManagedUsersFromRole(
  removedRole: string,
  fallbackRole: string
): ManagedUserRecord[] {
  return commitManagedUsers(
    readManagedUsers().map((row) =>
      row.role === removedRole ? { ...row, role: fallbackRole } : row
    )
  );
}

export function findManagedUserByUsername(username: string): ManagedUserRecord | undefined {
  const normalized = username.trim().toLowerCase();
  return readManagedUsers().find(
    (row) => row.username.trim().toLowerCase() === normalized
  );
}

export function isUsernameTaken(username: string, excludeId?: string): boolean {
  const normalized = username.trim().toLowerCase();
  return readManagedUsers().some(
    (row) =>
      row.username.trim().toLowerCase() === normalized &&
      (!excludeId || row.id !== excludeId)
  );
}

export const OTP_PENDING_STORAGE_KEY = "shaandar-crm-pending-otp";

export type PendingOtpSession = {
  username: string;
  code: string;
  expiresAt: number;
};

export function createPendingOtpSession(username: string, digits: 4 | 6 = 6): PendingOtpSession {
  const max = digits === 4 ? 9999 : 999999;
  const min = digits === 4 ? 1000 : 100000;
  const code = String(Math.floor(Math.random() * (max - min + 1)) + min);
  const session: PendingOtpSession = {
    username: username.trim().toLowerCase(),
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(OTP_PENDING_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function readPendingOtpSession(): PendingOtpSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OTP_PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingOtpSession;
    if (!parsed?.username || !parsed?.code) return null;
    if (Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(OTP_PENDING_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingOtpSession() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(OTP_PENDING_STORAGE_KEY);
  }
}

export function verifyPendingOtp(username: string, submittedCode: string): boolean {
  const session = readPendingOtpSession();
  if (!session) return false;
  if (session.username !== username.trim().toLowerCase()) return false;
  if (session.code !== submittedCode.trim()) return false;
  clearPendingOtpSession();
  return true;
}
