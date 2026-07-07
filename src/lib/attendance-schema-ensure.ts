import fs from "fs";
import path from "path";
import {
  extractSupabaseProjectRef,
  getDatabaseUrlResolutionHint,
  resolveDatabaseUrl,
} from "@/lib/database-url";

const MIGRATION_FILE = "011_ensure_attendance_tables.sql";

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
    (lower.includes("public.biometric_attendance") && lower.includes("not"))
  );
}

/** User-facing suffix when auto schema ensure cannot run. */
export function formatSchemaEnsureFailureMessage(originalError?: string): string {
  const hint = getDatabaseUrlResolutionHint();
  if (originalError) {
    return `${originalError} — ${hint}`;
  }
  return hint;
}

function readMigrationSql(): string | null {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    MIGRATION_FILE
  );
  if (!fs.existsSync(migrationPath)) return null;
  return fs.readFileSync(migrationPath, "utf8");
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
        "Attendance tables ensured (employee_attendance, biometric_attendance) and PostgREST cache reloaded.",
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
  if (ensureSucceeded) {
    return { ok: true, message: "Attendance tables already ensured this session." };
  }

  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = (async () => {
    const sql = readMigrationSql();
    if (!sql) {
      return { ok: false, message: `Migration file not found: ${MIGRATION_FILE}` };
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
