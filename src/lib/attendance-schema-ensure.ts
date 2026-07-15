import fs from "fs";
import path from "path";
import { resolveMigrationFile } from "@/lib/cloud-workspace-paths";
import { ATTENDANCE_SETUP_MESSAGE } from "@/lib/attendance-setup-messages";
import {
  extractSupabaseProjectRef,
  getDatabaseUrlResolutionHint,
  resolveDatabaseUrl,
} from "@/lib/database-url";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { resetPipelineStageColumnCache } from "@/lib/pipeline-stage-column-compat";

const MIGRATION_FILES = [
  "011_ensure_attendance_tables.sql",
  "012_attendance_staging_workflow.sql",
  "013_biometric_attendance_pipeline_stage.sql",
];

const PIPELINE_STAGE_MIGRATION_FILE = "013_biometric_attendance_pipeline_stage.sql";

let ensureInFlight: Promise<{ ok: boolean; message: string }> | null = null;

export { resolveDatabaseUrl } from "@/lib/database-url";

/** Detect Supabase PostgREST / Postgres schema errors (missing tables or columns). */
export function isAttendanceSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("could not find table") ||
    lower.includes("not find table") ||
    (lower.includes("relation") && lower.includes("does not exist")) ||
    (lower.includes("column") && lower.includes("does not exist")) ||
    (lower.includes("pipeline_stage") && lower.includes("does not exist")) ||
    (lower.includes("workflow_stage") && lower.includes("does not exist")) ||
    (lower.includes("public.employee_attendance") && lower.includes("not")) ||
    (lower.includes("public.biometric_attendance") && lower.includes("not")) ||
    (lower.includes("public.attendance_staging") && lower.includes("not")) ||
    (lower.includes("attendance_staging") && lower.includes("schema")) ||
    (lower.includes("attendance staging") && lower.includes("schema"))
  );
}

/** Short user-facing message when tables are missing (no stacked npm/env hints). */
export function formatSchemaEnsureFailureMessage(_originalError?: string): string {
  return ATTENDANCE_SETUP_MESSAGE;
}

/** Probe PostgREST for attendance tables without running DDL. */
export async function checkAttendanceSchemaReady(): Promise<{
  ready: boolean;
  pipelineStageReady?: boolean;
  message?: string;
}> {
  if (!isSupabaseServerConfigured()) {
    return {
      ready: true,
      pipelineStageReady: true,
      message: "Supabase not configured — local session mode.",
    };
  }

  try {
    const supabase = createAdminClient();
    const tables = [
      "employee_attendance",
      "biometric_attendance",
      "attendance_staging",
      "attendance_audit_log",
    ] as const;

    for (const table of tables) {
      const { error } = await supabase.from(table).select("id").limit(1);
      if (error && isAttendanceSchemaError(error.message ?? "")) {
        return {
          ready: false,
          pipelineStageReady: false,
          message: `Table public.${table} is missing from the database schema cache.`,
        };
      }
    }

    const { error: pipelineColumnError } = await supabase
      .from("biometric_attendance")
      .select("pipeline_stage, workflow_stage")
      .limit(1);
    if (pipelineColumnError) {
      const columnMessage = pipelineColumnError.message ?? "";
      if (
        isPipelineStageColumnError(columnMessage) ||
        columnMessage.toLowerCase().includes("pipeline_stage") ||
        columnMessage.toLowerCase().includes("workflow_stage")
      ) {
        return {
          ready: true,
          pipelineStageReady: false,
          message:
            "Column biometric_attendance.pipeline_stage is missing. Run migration 013 in Supabase SQL Editor (/api/v1/attendance/schema/migration-sql?file=013).",
        };
      }
    }

    return { ready: true, pipelineStageReady: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify attendance schema.";
    return { ready: false, pipelineStageReady: false, message };
  }
}

/** Assign LAYER_2_STAGING to legacy biometric rows missing pipeline_stage. */
export async function backfillMissingPipelineStages(): Promise<number> {
  if (!isSupabaseServerConfigured()) return 0;

  const { isPipelineStageColumnAvailable } = await import(
    "@/lib/pipeline-stage-column-compat"
  );
  if (!(await isPipelineStageColumnAvailable())) return 0;

  try {
    const supabase = createAdminClient();
    const { data: nullRows, error: nullError } = await supabase
      .from("biometric_attendance")
      .update({ pipeline_stage: "LAYER_2_STAGING" })
      .is("pipeline_stage", null)
      .select("id");
    if (nullError) {
      console.warn("[attendance-schema] pipeline backfill (null) failed:", nullError.message);
    }

    const { data: emptyRows, error: emptyError } = await supabase
      .from("biometric_attendance")
      .update({ pipeline_stage: "LAYER_2_STAGING" })
      .eq("pipeline_stage", "")
      .select("id");
    if (emptyError) {
      console.warn("[attendance-schema] pipeline backfill (empty) failed:", emptyError.message);
    }

    return (nullRows?.length ?? 0) + (emptyRows?.length ?? 0);
  } catch (error) {
    console.warn("[attendance-schema] pipeline backfill error:", error);
    return 0;
  }
}

export function isPipelineStageColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes("pipeline_stage") && lower.includes("does not exist")) ||
    (lower.includes("workflow_stage") && lower.includes("does not exist"))
  );
}

/** SQL for migration 013 — safe to paste in Supabase SQL Editor. */
export function readPipelineStageMigrationSql(): string {
  const migrationPath = resolveMigrationFile(PIPELINE_STAGE_MIGRATION_FILE);
  if (!fs.existsSync(migrationPath)) {
    return "-- Migration file 013_biometric_attendance_pipeline_stage.sql not found.";
  }
  return fs.readFileSync(migrationPath, "utf8");
}

function readMigrationSql(files: string[] = MIGRATION_FILES): string | null {
  const parts: string[] = [];
  for (const file of files) {
    const migrationPath = resolveMigrationFile(file);
    if (!fs.existsSync(migrationPath)) return null;
    parts.push(fs.readFileSync(migrationPath, "utf8"));
  }
  return parts.join("\n\n");
}

async function applyMigrationViaPrisma(
  sql: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const { isPrismaConfigured, prisma } = await import("@/lib/prisma");
    if (!isPrismaConfigured() || !prisma) {
      return { ok: false, message: "Prisma is not configured." };
    }
    await prisma.$executeRawUnsafe(sql);
    return {
      ok: true,
      message: "Pipeline stage columns applied via Prisma and PostgREST cache reloaded.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prisma schema apply failed.";
    console.error("[attendance-schema] prisma ensure failed:", message);
    return { ok: false, message };
  }
}

async function applyMigrationSql(
  sql: string,
  label: string
): Promise<{ ok: boolean; message: string }> {
  const databaseUrl = resolveDatabaseUrl();
  if (databaseUrl) {
    const postgresResult = await applyMigrationViaPostgres(sql, databaseUrl);
    if (postgresResult.ok) return postgresResult;
    console.warn(
      `[attendance-schema] direct postgres failed for ${label}, trying Prisma:`,
      postgresResult.message
    );
  }

  const prismaResult = await applyMigrationViaPrisma(sql);
  if (prismaResult.ok) return prismaResult;

  const managementResult = await applyMigrationViaManagementApi(sql);
  if (managementResult.ok) return managementResult;

  return {
    ok: false,
    message: getDatabaseUrlResolutionHint(),
  };
}

async function applyMigrationViaPostgres(
  sql: string,
  databaseUrl: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(sql);
    await client.end();
    return {
      ok: true,
      message:
        "Attendance tables ensured (employee_attendance, biometric_attendance, attendance_staging, attendance_audit_log) and PostgREST cache reloaded.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schema ensure failed.";
    console.error("[attendance-schema] postgres ensure failed:", message);
    return { ok: false, message };
  }
}

/** Fallback when only SUPABASE_ACCESS_TOKEN is configured (no postgres password). */
async function applyMigrationViaManagementApi(
  sql: string
): Promise<{ ok: boolean; message: string }> {
  const accessToken =
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_MANAGEMENT_TOKEN?.trim();
  const projectRef = extractSupabaseProjectRef();

  if (!accessToken || !projectRef) {
    return { ok: false, message: "Management API credentials not configured." };
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        "[attendance-schema] Management API failed:",
        response.status,
        body.slice(0, 300)
      );
      return {
        ok: false,
        message: `Management API schema apply failed (HTTP ${response.status}).`,
      };
    }

    return {
      ok: true,
      message:
        "Attendance tables ensured via Supabase Management API and PostgREST cache reloaded.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Management API request failed.";
    console.error("[attendance-schema] Management API error:", message);
    return { ok: false, message };
  }
}

const POSTGREST_RELOAD_SQL = "NOTIFY pgrst, 'reload schema';";

/** Reload PostgREST schema cache after DDL (requires postgres or Management API). */
export async function reloadPostgrestSchemaCache(): Promise<{ ok: boolean; message: string }> {
  const databaseUrl = resolveDatabaseUrl();
  if (databaseUrl) {
    const postgresResult = await applyMigrationViaPostgres(POSTGREST_RELOAD_SQL, databaseUrl);
    if (postgresResult.ok) return postgresResult;
  }

  const managementResult = await applyMigrationViaManagementApi(POSTGREST_RELOAD_SQL);
  if (managementResult.ok) return managementResult;

  return { ok: false, message: "PostgREST reload skipped — no postgres credentials." };
}

/**
 * Apply migration 013 only — adds pipeline_stage + workflow_stage columns.
 */
export async function ensurePipelineStageColumn(): Promise<{
  ok: boolean;
  message: string;
  migrationSql?: string;
}> {
  const check = await checkAttendanceSchemaReady();
  if (check.pipelineStageReady !== false) {
    return { ok: true, message: "pipeline_stage column already exists." };
  }

  const sql = readPipelineStageMigrationSql();
  const result = await applyMigrationSql(sql, "pipeline_stage");

  if (result.ok) {
    resetPipelineStageColumnCache();
    await reloadPostgrestSchemaCache();
    resetPipelineStageColumnCache();
    const verify = await checkAttendanceSchemaReady();
    if (verify.pipelineStageReady !== false) {
      await backfillMissingPipelineStages();
      return result;
    }
    return {
      ok: false,
      message: "Migration ran but pipeline_stage column is still missing. Reload PostgREST schema cache.",
      migrationSql: sql,
    };
  }

  return { ...result, migrationSql: sql };
}

/**
 * Apply migrations 011–013 when postgres, Prisma, or Management API credentials are available.
 * Safe to call multiple times — migration SQL is idempotent.
 */
export async function ensureAttendanceTablesSchema(): Promise<{
  ok: boolean;
  message: string;
  migrationSql?: string;
}> {
  const existing = await checkAttendanceSchemaReady();
  if (existing.ready && existing.pipelineStageReady !== false) {
    return { ok: true, message: "Attendance tables and pipeline columns already exist." };
  }

  if (existing.ready && existing.pipelineStageReady === false) {
    return ensurePipelineStageColumn();
  }

  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = (async () => {
    const sql = readMigrationSql();
    if (!sql) {
      return {
        ok: false,
        message: `Migration files not found: ${MIGRATION_FILES.join(", ")}`,
        migrationSql: readPipelineStageMigrationSql(),
      };
    }

    const result = await applyMigrationSql(sql, "attendance_tables");
    if (result.ok) {
      resetPipelineStageColumnCache();
      const verify = await checkAttendanceSchemaReady();
      if (verify.ready) return result;
      return {
        ok: false,
        message:
          verify.message ??
          "Migrations ran but attendance schema is still not ready. Run SQL in Supabase SQL Editor.",
        migrationSql: readPipelineStageMigrationSql(),
      };
    }

    return { ...result, migrationSql: readPipelineStageMigrationSql() };
  })();

  try {
    return await ensureInFlight;
  } finally {
    ensureInFlight = null;
  }
}
