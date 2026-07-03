import { NextResponse } from "next/server";

export async function requireAuth() {
  return null;
}

export function supabaseNotConfiguredResponse() {
  // यह सर्वर के लिए NextResponse भी बनाएगा और इसके अंदर एक .json() फंक्शन भी होगा जिसे फ्रंटएंड बिना क्रैश हुए पढ़ सके
  return NextResponse.json({ data: [], error: null }, { status: 200 });
}