import { NextResponse } from "next/server";

export async function requireAuth() {
  return null;
}

export function supabaseNotConfiguredResponse() {
  return NextResponse.json([], { status: 200 });
}