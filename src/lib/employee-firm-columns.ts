import type { SupabaseClient } from "@supabase/supabase-js";
import { splitAssignedFromGroup } from "@/lib/employee-assigned-from";
import type { EmployeeInsert } from "@/types/employee-db";

const SCHEMA_COLUMN_PATTERN = /could not find the '([^']+)' column/i;

/** Columns that may be absent on older DBs or stale PostgREST caches — safe to omit on retry. */
const OPTIONAL_EMPLOYEE_COLUMNS = new Set([
  "assigned_from_group",
  "assigned_firm",
  "assigned_contractor",
  "esi_status",
  "pf_status",
  "esi_enabled",
  "pf_enabled",
  "assigned_firm_group",
  "pf_active_firm",
  "firm_head_profile",
  "pf_firm",
  "overtime_hourly_rate",
]);

type LegacyRedirect = (payload: Record<string, unknown>) => Record<string, unknown>;

const LEGACY_COLUMN_REDIRECTS: Record<string, LegacyRedirect> = {
  assigned_from_group: (payload) => {
    const next = { ...payload };
    if ("assigned_from_group" in next && next.assigned_from_group != null) {
      const { assignedFirm, assignedContractor } = splitAssignedFromGroup(
        String(next.assigned_from_group)
      );
      if (assignedFirm) next.assigned_firm = assignedFirm;
      if (assignedContractor) next.assigned_contractor = assignedContractor;
      delete next.assigned_from_group;
    }
    return next;
  },
  esi_status: (payload) => {
    const next = { ...payload };
    if ("esi_status" in next) {
      next.esi_enabled = next.esi_status === "Active";
      delete next.esi_status;
    }
    return next;
  },
  pf_status: (payload) => {
    const next = { ...payload };
    if ("pf_status" in next) {
      next.pf_enabled = next.pf_status === "Active";
      delete next.pf_status;
    }
    return next;
  },
  assigned_firm_group: (payload) => {
    const next = { ...payload };
    if (next.assigned_firm_group) {
      next.firm_head_profile = next.assigned_firm_group;
    }
    delete next.assigned_firm_group;
    return next;
  },
  pf_active_firm: (payload) => {
    const next = { ...payload };
    if (next.pf_active_firm) {
      next.pf_firm = next.pf_active_firm;
    }
    delete next.pf_active_firm;
    return next;
  },
};

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
    "(adds assigned_from_group, assigned_firm, assigned_contractor, esi_status, pf_status, " +
    "assigned_firm_group, pf_active_firm, overtime_hourly_rate and reloads PostgREST), " +
    "or POST /api/admin/sync-employee-schema when DATABASE_URL is configured."
  );
}

export function appendEmployeeSchemaHint(message: string): string {
  if (
    message.includes("017_employee_schema_cache_sync") ||
    message.includes("/api/admin/sync-employee-schema")
  ) {
    return message;
  }
  if (isEmployeeSchemaCacheError(message)) {
    return message + employeeSchemaHint();
  }
  return message;
}

/** @deprecated Use employeeSchemaHint */
export function employeeFirmSchemaHint(): string {
  return employeeSchemaHint();
}

function toRecord(insert: EmployeeInsert): Record<string, unknown> {
  return { ...insert };
}

async function writeEmployeePayloadResilient(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  mode: "insert" | "update",
  id?: string
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  let current = { ...payload };
  const legacyRedirectAttempted = new Set<string>();

  for (let attempt = 0; attempt < 32; attempt++) {
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
      const redirect = LEGACY_COLUMN_REDIRECTS[missingColumn];
      if (redirect && !legacyRedirectAttempted.has(missingColumn)) {
        legacyRedirectAttempted.add(missingColumn);
        current = redirect(current);
        continue;
      }

      if (OPTIONAL_EMPLOYEE_COLUMNS.has(missingColumn)) {
        delete current[missingColumn];
        if (missingColumn === "assigned_firm") delete current.assigned_contractor;
        if (missingColumn === "assigned_contractor") delete current.assigned_firm;
        continue;
      }
    }

    return {
      data: null,
      error: {
        message: appendEmployeeSchemaHint(
          `Employee save blocked by database schema cache (${message}).`
        ),
      },
    };
  }

  return {
    data: null,
    error: {
      message: appendEmployeeSchemaHint(
        "Employee save failed after schema fallbacks exhausted."
      ),
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
