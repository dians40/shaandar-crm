import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeAuthSession, AUTH_COOKIE } from "@/lib/auth";
import type { AuthSessionPayload } from "@/types/auth-session";

export function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    },
    { status: 503 }
  );
}

export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const session = decodeAuthSession(cookieStore.get(AUTH_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function getApiAuthSession(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  return decodeAuthSession(cookieStore.get(AUTH_COOKIE)?.value);
}
