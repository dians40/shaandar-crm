import fs from "fs";
import path from "path";
import { ATTENDANCE_SETUP_MESSAGE } from "@/lib/attendance-setup-messages";
import {
  extractSupabaseProjectRef,
  getDatabaseUrlResolutionHint,
  resolveDatabaseUrl,
} from "@/lib/database-url";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";

const MIGRATION_FILES = [
  "011_ensure_attendance_tables.sql",
  "012_attendance_staging_workflow.sql",
];

let ensureInFlight: Promise<{ ok: boolean; message: string }> | null = null;
let ensureSucceeded = false;

export { resolveDatabaseUrl } from "@/lib/database-url";

/** Detect Supabase PostgREST / Postgres "table not found" errors. */
export function isAttendanceSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("could not find table") ||
    lower.includes("not find table") ||
    (lower.includes("relation") && lower.includes("does not exist")) ||
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
  message?: string;
}> {
  if (!isSupabaseServerConfigured()) {
    return { ready: true, message: "Supabase not configured — local session mode." };
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
          message: `Table public.${table} is missing from the database schema cache.`,
        };
      }
    }

    return { ready: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify attendance schema.";
    return { ready: false, message };
  }
}

function readMigrationSql(): string | null {
  const parts: string[] = [];
  for (const file of MIGRATION_FILES) {
    const migrationPath = path.join(process.cwd(), "supabase", "migrations", file);
    if (!fs.existsSync(migrationPath)) return null;
    parts.push(fs.readFileSync(migrationPath, "utf8"));
  }
  return parts.join("\n\n");
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

/**
 * Apply migration 011 when postgres or Management API credentials are available.
 * Safe to call multiple times — migration SQL is idempotent.
 */
export async function ensureAttendanceTablesSchema(): Promise<{
  ok: boolean;
  message: string;
}> {
  const existing = await checkAttendanceSchemaReady();
  if (existing.ready) {
    ensureSucceeded = true;
    return { ok: true, message: "Attendance tables already exist." };
  }

  if (ensureSucceeded) {
    return { ok: true, message: "Attendance tables already ensured this session." };
  }

  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = (async () => {
    const sql = readMigrationSql();
    if (!sql) {
      return { ok: false, message: `Migration files not found: ${MIGRATION_FILES.join(", ")}` };
    }

    const databaseUrl = resolveDatabaseUrl();
    if (databaseUrl) {
      const postgresResult = await applyMigrationViaPostgres(sql, databaseUrl);
      if (postgresResult.ok) {
        ensureSucceeded = true;
        return postgresResult;
      }
      console.warn(
        "[attendance-schema] direct postgres failed, trying Management API:",
        postgresResult.message
      );
    }

    const managementResult = await applyMigrationViaManagementApi(sql);
    if (managementResult.ok) {
      ensureSucceeded = true;
      return managementResult;
    }

    return {
      ok: false,
      message: getDatabaseUrlResolutionHint(),
    };
  })();

  try {
    return await ensureInFlight;
  } finally {
    ensureInFlight = null;
  }
}
