"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  encodeAuthSession,
  resolveAdminSession,
} from "@/lib/auth";
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
  return { success: true, redirectTo: "/dashboard" };
}

export async function establishManagedUserSessionAction(
  session: AuthSessionPayload
): Promise<LoginState> {
  if (!session?.username || !session?.role || session.isAdmin) {
    return { error: "Invalid session payload." };
  }

  await setSessionCookie({
    username: session.username,
    fullName: session.fullName,
    role: session.role,
    pipelineStage: session.pipelineStage,
    isAdmin: false,
  });

  return { success: true };
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
