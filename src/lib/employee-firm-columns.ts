import type { SupabaseClient } from "@supabase/supabase-js";
import { splitAssignedFromGroup } from "@/lib/employee-assigned-from";
import type { EmployeeInsert } from "@/types/employee-db";

const SCHEMA_COLUMN_PATTERN = /could not find the '([^']+)' column/i;

/** Columns introduced after the base employees table — may be absent on older DBs. */
const OPTIONAL_EMPLOYEE_COLUMNS = new Set([
  "assigned_from_group",
  "esi_status",
  "pf_status",
  "assigned_firm_group",
  "pf_active_firm",
  "firm_head_profile",
  "pf_firm",
  "overtime_hourly_rate",
]);

export function isEmployeeSchemaCacheError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    SCHEMA_COLUMN_PATTERN.test(message) ||
    (lower.includes("could not find") && lower.includes("column"))
  );
}

/** @deprecated Use isEmployeeSchemaCacheError */
export function isEmployeeFirmSchemaError(message: string): boolean {
  return isEmployeeSchemaCacheError(message);
}

export function parseMissingEmployeeColumn(message: string): string | null {
  const match = SCHEMA_COLUMN_PATTERN.exec(message);
  return match?.[1] ?? null;
}

export function employeeSchemaHint(): string {
  return (
    " Run supabase/migrations/017_employee_schema_cache_sync.sql in the Supabase SQL Editor " +
    "(adds assigned_from_group, esi_status, pf_status, assigned_firm_group, pf_active_firm and reloads PostgREST), " +
    "or POST /api/admin/sync-employee-schema when DATABASE_URL is configured."
  );
}

/** @deprecated Use employeeSchemaHint */
export function employeeFirmSchemaHint(): string {
  return employeeSchemaHint();
}

function toRecord(insert: EmployeeInsert): Record<string, unknown> {
  return { ...insert };
}

function applyLegacyEmployeeColumnMappings(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...payload };

  if ("assigned_from_group" in next && next.assigned_from_group != null) {
    const { assignedFirm, assignedContractor } = splitAssignedFromGroup(
      String(next.assigned_from_group)
    );
    if (assignedFirm) next.assigned_firm = assignedFirm;
    if (assignedContractor) next.assigned_contractor = assignedContractor;
    delete next.assigned_from_group;
  }

  if ("esi_status" in next) {
    next.esi_enabled = next.esi_status === "Active";
    delete next.esi_status;
  }

  if ("pf_status" in next) {
    next.pf_enabled = next.pf_status === "Active";
    delete next.pf_status;
  }

  if ("assigned_firm_group" in next || "pf_active_firm" in next) {
    if (next.assigned_firm_group) {
      next.firm_head_profile = next.assigned_firm_group;
    }
    if (next.pf_active_firm) {
      next.pf_firm = next.pf_active_firm;
    }
    delete next.assigned_firm_group;
    delete next.pf_active_firm;
  }

  return next;
}

async function writeEmployeePayloadResilient(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  mode: "insert" | "update",
  id?: string
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  let current = { ...payload };
  let legacyMapped = false;

  for (let attempt = 0; attempt < 24; attempt++) {
    const result =
      mode === "insert"
        ? await supabase.from("employees").insert(current).select("id").single()
        : await supabase.from("employees").update(current).eq("id", id!).select("id").single();

    if (!result.error && result.data) {
      return { data: result.data as { id: string }, error: null };
    }

    if (!result.error) {
      return { data: null, error: null };
    }

    const message = result.error.message ?? "";
    if (!isEmployeeSchemaCacheError(message)) {
      return { data: null, error: result.error };
    }

    const missingColumn = parseMissingEmployeeColumn(message);
    if (missingColumn && missingColumn in current) {
      delete current[missingColumn];
      continue;
    }

    if (!legacyMapped) {
      current = applyLegacyEmployeeColumnMappings(current);
      legacyMapped = true;
      continue;
    }

    if (missingColumn && OPTIONAL_EMPLOYEE_COLUMNS.has(missingColumn)) {
      delete current[missingColumn];
      continue;
    }

    return {
      data: null,
      error: {
        message:
          `Employee save blocked by database schema cache (${message}).` + employeeSchemaHint(),
      },
    };
  }

  return {
    data: null,
    error: {
      message: "Employee save failed after schema fallbacks exhausted." + employeeSchemaHint(),
    },
  };
}

export async function insertEmployeeWithFirmColumnFallback(
  supabase: SupabaseClient,
  insert: EmployeeInsert
): Promise<{
  data: { id: string } | null;
  error: { message: string } | null;
  variantUsed: "resilient";
}> {
  const result = await writeEmployeePayloadResilient(
    supabase,
    toRecord(insert),
    "insert"
  );
  return { ...result, variantUsed: "resilient" };
}

export async function updateEmployeeWithFirmColumnFallback(
  supabase: SupabaseClient,
  id: string,
  insert: EmployeeInsert,
  extra: Record<string, unknown> = {}
): Promise<{ error: { message: string } | null; variantUsed: "resilient" }> {
  const result = await writeEmployeePayloadResilient(
    supabase,
    { ...toRecord(insert), ...extra },
    "update",
    id
  );
  return { error: result.error, variantUsed: "resilient" };
}
