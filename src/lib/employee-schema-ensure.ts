import fs from "fs";
import { resolveMigrationFile } from "@/lib/cloud-workspace-paths";
import { resolveDatabaseUrl } from "@/lib/database-url";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import {
  employeeSchemaHint,
  isEmployeeSchemaCacheError,
} from "@/lib/employee-firm-columns";

const MIGRATION_FILES = [
  "004_employee_overtime_hourly_rate.sql",
  "005_employee_firm_contractor.sql",
  "006_employee_unified_assignment_status.sql",
  "016_employee_firm_head_pf_firm.sql",
  "017_employee_schema_cache_sync.sql",
];

let ensureInFlight: Promise<{ ok: boolean; message: string }> | null = null;
let ensureSucceeded = false;

export function isEmployeeSchemaError(message: string): boolean {
  return isEmployeeSchemaCacheError(message);
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
      .select(
        "assigned_from_group, assigned_firm, assigned_contractor, esi_status, pf_status, assigned_firm_group, pf_active_firm, overtime_hourly_rate"
      )
      .limit(1);

    if (error && isEmployeeSchemaCacheError(error.message ?? "")) {
      return {
        ready: false,
        message: error.message ?? "Employee columns missing from schema cache.",
      };
    }

    if (error) {
      return { ready: false, message: error.message };
    }

    return { ready: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify employee schema.";
    return { ready: false, message };
  }
}

function readMigrationSql(): string | null {
  const parts: string[] = [];
  for (const file of MIGRATION_FILES) {
    const migrationPath = resolveMigrationFile(file);
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
        "Employee schema migrations applied (assigned_from_group, statutory status, firm columns, overtime_hourly_rate) and PostgREST cache reloaded.",
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
    return { ok: true, message: "Employee schema already ensured this session." };
  }

  const probe = await checkEmployeeFirmColumnsReady();
  if (probe.ready) {
    ensureSucceeded = true;
    return { ok: true, message: probe.message ?? "Employee schema ready." };
  }

  if (ensureInFlight) {
    return ensureInFlight;
  }

  ensureInFlight = (async () => {
    const databaseUrl = resolveDatabaseUrl();
    if (!databaseUrl) {
      return {
        ok: false,
        message: "DATABASE_URL not configured." + employeeSchemaHint(),
      };
    }

    const sql = readMigrationSql();
    if (!sql) {
      return { ok: false, message: "Employee migration files not found." };
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
