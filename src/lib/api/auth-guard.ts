import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function requireAuth() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(AUTH_COOKIE)?.value === "true";

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export function supabaseNotConfiguredResponse() {
  return new Response(JSON.stringify({ data: [], error: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}