import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import {
  checkAttendanceSchemaReady,
  ensureAttendanceTablesSchema,
} from "@/lib/attendance-schema-ensure";
import { getDatabaseUrlResolutionHint } from "@/lib/database-url";

/**
 * GET /api/v1/attendance/schema/ensure — lightweight probe (no DDL).
 * POST — apply migration 011 when postgres or Management API credentials exist.
 */
export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      ok: true,
      ready: true,
      message: "Supabase not configured — local session mode.",
    });
  }

  const check = await checkAttendanceSchemaReady();
  return NextResponse.json({
    ok: check.ready,
    ready: check.ready,
    message: check.message ?? (check.ready ? "Attendance tables are ready." : undefined),
    hint: check.ready ? undefined : getDatabaseUrlResolutionHint(),
  });
}

export async function POST() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      ok: true,
      ready: true,
      message: "Supabase not configured — local session mode.",
    });
  }

  const check = await checkAttendanceSchemaReady();
  if (check.ready) {
    return NextResponse.json({
      ok: true,
      ready: true,
      message: "Attendance tables already exist.",
    });
  }

  const result = await ensureAttendanceTablesSchema();
  console.log(
    "[attendance-schema] ensure via API:",
    result.ok ? "success" : result.message
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        error: result.message,
        hint: getDatabaseUrlResolutionHint(),
        setupRequired: true,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    ready: true,
    message: result.message,
  });
}
