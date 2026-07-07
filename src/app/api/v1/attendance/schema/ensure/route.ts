import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import {
  checkAttendanceSchemaReady,
  ensureAttendanceTablesSchema,
} from "@/lib/attendance-schema-ensure";
import { checkAttendanceStorageReady } from "@/lib/attendance-storage-fallback";
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

  const supabase = createAdminClient();
  const storageReady = await checkAttendanceStorageReady(supabase);
  if (storageReady) {
    return NextResponse.json({
      ok: true,
      ready: true,
      mode: "storage",
      message:
        "Cloud storage is ready. Process & Save works without SQL tables — records are stored in Supabase Storage.",
    });
  }

  return NextResponse.json({
    ok: false,
    ready: false,
    mode: "none",
    message: check.message ?? "Attendance storage is not ready.",
    hint: getDatabaseUrlResolutionHint(),
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

  const supabase = createAdminClient();
  const storageReady = await checkAttendanceStorageReady(supabase);
  if (storageReady) {
    return NextResponse.json({
      ok: true,
      ready: true,
      mode: "storage",
      message:
        "SQL tables are not created yet, but cloud storage is ready — Process & Save will work.",
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
