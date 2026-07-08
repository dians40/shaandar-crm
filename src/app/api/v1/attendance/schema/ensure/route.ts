import { NextResponse } from "next/server";
import {
  checkAttendanceSchemaReady,
  ensureAttendanceTablesSchema,
  ensurePipelineStageColumn,
  readPipelineStageMigrationSql,
} from "@/lib/attendance-schema-ensure";
import { getDatabaseUrlResolutionHint } from "@/lib/database-url";
import { getSupabaseSqlEditorUrl } from "@/lib/attendance-setup-messages";
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
      message: "Attendance SQL tables and pipeline columns are ready.",
    });
  }

  return NextResponse.json({
    ok: false,
    ready: false,
    mode: "none",
    message: check.message ?? "Attendance SQL tables are not ready.",
    hint: getDatabaseUrlResolutionHint(),
    migrationSqlUrl: "/api/v1/attendance/schema/migration-sql?file=013",
    sqlEditorUrl: getSupabaseSqlEditorUrl(),
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
      message: "Attendance tables and pipeline columns already exist.",
    });
  }

  const result = await ensureAttendanceTablesSchema();
  if (!result.ok) {
    const pipelineOnly = await ensurePipelineStageColumn();
    if (pipelineOnly.ok) {
      return NextResponse.json({
        ok: true,
        ready: true,
        mode: "sql",
        message: pipelineOnly.message,
      });
    }
  }

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
      migrationSql: result.migrationSql ?? readPipelineStageMigrationSql(),
      migrationSqlUrl: "/api/v1/attendance/schema/migration-sql?file=013",
      sqlEditorUrl: getSupabaseSqlEditorUrl(),
      setupRequired: true,
    },
    { status: 503 }
  );
}
