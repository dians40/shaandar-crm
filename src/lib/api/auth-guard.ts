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
  return NextResponse.json(
    {
      error:
        "Supabase is not configured. Add credentials to .env.local and restart the dev server.",
    },
    { status: 503 }
  );
}
