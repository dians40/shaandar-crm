import { NextResponse } from "next/server";

export async function requireAuth() {
  return null;
}

export function supabaseNotConfiguredResponse() {
  return NextResponse.json({ employees: [], error: "Supabase is not configured." }, { status: 503 });
}