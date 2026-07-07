import fs from "fs";
import path from "path";

const MIGRATION_FILE = "011_ensure_attendance_tables.sql";

let ensureInFlight: Promise<{ ok: boolean; message: string }> | null = null;
let ensureSucceeded = false;

export function resolveDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

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

/**
 * Apply migration 011 when DATABASE_URL (or SUPABASE_DB_URL) is configured.
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
    const databaseUrl = resolveDatabaseUrl();
    if (!databaseUrl) {
      return {
        ok: false,
        message:
          "DATABASE_URL not configured. Run supabase/migrations/011_ensure_attendance_tables.sql in Supabase SQL Editor.",
      };
    }

    const sql = readMigrationSql();
    if (!sql) {
      return { ok: false, message: `Migration file not found: ${MIGRATION_FILE}` };
    }

    try {
      const pg = await import("pg");
      const client = new pg.default.Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      await client.query(sql);
      await client.end();
      ensureSucceeded = true;
      return {
        ok: true,
        message:
          "Attendance tables ensured (employee_attendance, biometric_attendance) and PostgREST cache reloaded.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Schema ensure failed.";
      console.error("[attendance-schema] ensure failed:", message);
      return { ok: false, message };
    } finally {
      ensureInFlight = null;
    }
  })();

  return ensureInFlight;
}
