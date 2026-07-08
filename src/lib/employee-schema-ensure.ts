import fs from "fs";
import path from "path";
import { resolveDatabaseUrl } from "@/lib/database-url";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { isEmployeeFirmSchemaError } from "@/lib/employee-firm-columns";

const MIGRATION_FILE = "016_employee_firm_head_pf_firm.sql";

let ensureInFlight: Promise<{ ok: boolean; message: string }> | null = null;
let ensureSucceeded = false;

export function isEmployeeSchemaError(message: string): boolean {
  return isEmployeeFirmSchemaError(message);
}

export async function checkEmployeeFirmColumnsReady(): Promise<{
  ready: boolean;
  message?: string;
}> {
  if (!isSupabaseServerConfigured()) {
    return { ready: true, message: "Supabase not configured — local session mode." };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("employees")
      .select("assigned_firm_group, pf_active_firm")
      .limit(1);

    if (error && isEmployeeFirmSchemaError(error.message ?? "")) {
      const legacyProbe = await supabase
        .from("employees")
        .select("firm_head_profile, pf_firm")
        .limit(1);

      if (!legacyProbe.error) {
        return {
          ready: true,
          message: "Legacy firm column names detected (firm_head_profile, pf_firm).",
        };
      }

      return {
        ready: false,
        message: error.message ?? "Employee firm columns missing from schema cache.",
      };
    }

    return { ready: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify employee firm columns.";
    return { ready: false, message };
  }
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
        "Employee firm columns ensured (assigned_firm_group, pf_active_firm) and PostgREST cache reloaded.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Employee schema ensure failed.";
    console.error("[employee-schema] postgres ensure failed:", message);
    return { ok: false, message };
  }
}

export async function ensureEmployeeFirmColumnsSchema(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (ensureSucceeded) {
    return { ok: true, message: "Employee firm columns already ensured this session." };
  }

  const probe = await checkEmployeeFirmColumnsReady();
  if (probe.ready) {
    ensureSucceeded = true;
    return { ok: true, message: probe.message ?? "Employee firm columns ready." };
  }

  if (ensureInFlight) {
    return ensureInFlight;
  }

  ensureInFlight = (async () => {
    const databaseUrl = resolveDatabaseUrl();
    if (!databaseUrl) {
      return {
        ok: false,
        message:
          "DATABASE_URL not configured. Run supabase/migrations/016_employee_firm_head_pf_firm.sql in Supabase SQL Editor.",
      };
    }

    const sql = readMigrationSql();
    if (!sql) {
      return { ok: false, message: `Migration file ${MIGRATION_FILE} not found.` };
    }

    const result = await applyMigrationViaPostgres(sql, databaseUrl);
    if (result.ok) {
      ensureSucceeded = true;
    }
    return result;
  })();

  try {
    return await ensureInFlight;
  } finally {
    ensureInFlight = null;
  }
}
