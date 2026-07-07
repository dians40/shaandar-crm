import { NextResponse } from "next/server";
import {
  checkAttendanceSchemaReady,
  ensureAttendanceTablesSchema,
} from "@/lib/attendance-schema-ensure";
import { getDatabaseUrlResolutionHint } from "@/lib/database-url";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";

/**
 * GET /api/v1/attendance/schema/ensure — lightweight probe (no DDL).
 * POST — apply migrations 011 + 012 when postgres or Management API credentials exist.
 */
export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      ok: true,
      ready: true,
      mode: "local",
      message: "Supabase not configured — local session mode.",
    });
  }

  const check = await checkAttendanceSchemaReady();
  if (check.ready) {
    return NextResponse.json({
      ok: true,
      ready: true,
      mode: "sql",
      message: "Attendance SQL tables are ready.",
    });
  }

  return NextResponse.json({
    ok: false,
    ready: false,
    mode: "none",
    message: check.message ?? "Attendance SQL tables are not ready.",
    hint: getDatabaseUrlResolutionHint(),
    setupRequired: true,
  });
}

export async function POST() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      ok: true,
      ready: true,
      mode: "local",
      message: "Supabase not configured — local session mode.",
    });
  }

  const check = await checkAttendanceSchemaReady();
  if (check.ready) {
    return NextResponse.json({
      ok: true,
      ready: true,
      mode: "sql",
      message: "Attendance tables already exist.",
    });
  }

  const result = await ensureAttendanceTablesSchema();
  console.log(
    "[attendance-schema] ensure via API:",
    result.ok ? "success" : result.message
  );

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      ready: true,
      mode: "sql",
      message: result.message,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      ready: false,
      mode: "none",
      error: result.message,
      hint: getDatabaseUrlResolutionHint(),
      setupRequired: true,
    },
    { status: 503 }
  );
}
