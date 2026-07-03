import { NextResponse } from "next/server";

export async function requireAuth() {
  return null;
}

export function supabaseNotConfiguredResponse() {
  // फ्रंटएंड को 'data' के अंदर खाली एरे मिलेगा ताकि .length चेक करने पर कोड क्रैश न हो
  return NextResponse.json({ data: [], error: null }, { status: 200 });
}