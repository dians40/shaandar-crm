"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  encodeAuthSession,
  resolveAdminSession,
  resolveSanjeevLayer2Session,
} from "@/lib/auth";
import { getPostLoginRedirect } from "@/lib/auth-navigation";
import {
  findManagedUserByUsernameServer,
  writeManagedUsersServer,
} from "@/lib/managed-users-server-store";
import {
  buildManagedUserAuthSession,
  type ManagedUserRecord,
} from "@/types/managed-user";
import type { AuthSessionPayload } from "@/types/auth-session";

export type LoginState = {
  error?: string;
  success?: boolean;
  redirectTo?: string;
};

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

async function setSessionCookie(session: AuthSessionPayload) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, encodeAuthSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function authenticateAdminAction(
  username: string,
  password: string
): Promise<LoginState> {
  if (!username.trim() || !password) {
    return { error: "Please enter both username and password." };
  }

  const adminSession = resolveAdminSession(username, password);
  if (!adminSession) {
    return { error: "Invalid username or password. Please try again." };
  }

  await setSessionCookie(adminSession);
  return { success: true, redirectTo: getPostLoginRedirect(adminSession) };
}

export type ManagedUserAuthResult = LoginState & {
  session?: AuthSessionPayload;
  otpRequired?: boolean;
};

export async function authenticateManagedUserAction(
  username: string,
  password: string
): Promise<ManagedUserAuthResult> {
  if (!username.trim() || !password) {
    return { error: "Please enter both username and password." };
  }

  const sanjeevSession = resolveSanjeevLayer2Session(username, password);
  if (sanjeevSession) {
    return {
      success: true,
      session: sanjeevSession,
      otpRequired: false,
      redirectTo: getPostLoginRedirect(sanjeevSession),
    };
  }

  const managedUser = await findManagedUserByUsernameServer(username);
  if (!managedUser || managedUser.password !== password) {
    return { error: "Invalid username or password. Please try again." };
  }

  const session = buildManagedUserAuthSession(managedUser);
  return {
    success: true,
    session,
    otpRequired: managedUser.otpEnabled,
    redirectTo: getPostLoginRedirect(session),
  };
}

export async function persistManagedUsersAction(users: ManagedUserRecord[]): Promise<LoginState> {
  try {
    await writeManagedUsersServer(users);
    return { success: true };
  } catch {
    return { error: "Failed to persist managed users to server store." };
  }
}

export async function establishManagedUserSessionAction(
  session: AuthSessionPayload
): Promise<LoginState> {
  if (!session?.username || !session?.role || session.isAdmin) {
    return { error: "Invalid session payload." };
  }

  const normalizedSession = {
    username: session.username,
    fullName: session.fullName,
    role: session.role,
    pipelineStage: session.pipelineStage,
    isAdmin: false as const,
  };

  await setSessionCookie(normalizedSession);

  return { success: true, redirectTo: getPostLoginRedirect(normalizedSession) };
}

/** @deprecated Use authenticateAdminAction or establishManagedUserSessionAction */
export async function establishSessionAction(): Promise<LoginState> {
  return { error: "Direct session establishment is disabled. Please sign in with valid credentials." };
}

/** @deprecated Use authenticateAdminAction */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("email") ?? formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  return authenticateAdminAction(username, password);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}

export async function getServerAuthSession(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(AUTH_COOKIE)?.value;
  const { decodeAuthSession } = await import("@/lib/auth");
  return decodeAuthSession(raw);
}
