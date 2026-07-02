import { NextResponse } from "next/server";
import {
  createAdminClient,
  getSupabaseConfigIssue,
  isSupabaseServerConfigured,
} from "@/lib/supabase/admin";

export async function GET() {
  const configIssue = getSupabaseConfigIssue();
  if (!isSupabaseServerConfigured() || configIssue) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          configIssue ??
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          connected: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      connected: true,
      employeeCount: count ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase connection failed.";
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        connected: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
