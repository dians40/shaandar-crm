import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployeeInsert } from "@/types/employee-db";

export type EmployeeFirmColumnVariant = "canonical" | "legacy" | "omit";

export function isEmployeeFirmSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes("schema cache") || lower.includes("could not find the")) &&
    (lower.includes("assigned_firm_group") ||
      lower.includes("pf_active_firm") ||
      lower.includes("firm_head_profile") ||
      lower.includes("pf_firm"))
  );
}

export function employeeFirmSchemaHint(): string {
  return (
    " Run supabase/migrations/016_employee_firm_head_pf_firm.sql in the Supabase SQL Editor " +
    "(includes NOTIFY pgrst, 'reload schema'), or POST /api/admin/sync-employee-schema when DATABASE_URL is configured."
  );
}

export function buildEmployeeDbPayload(
  insert: EmployeeInsert,
  variant: EmployeeFirmColumnVariant
): Record<string, unknown> {
  const assignedFirmGroup = insert.assigned_firm_group;
  const pfActiveFirm = insert.pf_active_firm;
  const rest = { ...insert } as Record<string, unknown>;
  delete rest.assigned_firm_group;
  delete rest.pf_active_firm;
  delete rest.firm_head_profile;
  delete rest.pf_firm;

  if (variant === "omit") {
    return { ...rest };
  }

  if (variant === "legacy") {
    return {
      ...rest,
      firm_head_profile: assignedFirmGroup,
      pf_firm: pfActiveFirm,
    };
  }

  return {
    ...rest,
    assigned_firm_group: assignedFirmGroup,
    pf_active_firm: pfActiveFirm,
  };
}

export async function insertEmployeeWithFirmColumnFallback(
  supabase: SupabaseClient,
  insert: EmployeeInsert
): Promise<{ data: { id: string } | null; error: { message: string } | null; variantUsed: EmployeeFirmColumnVariant }> {
  const variants: EmployeeFirmColumnVariant[] = ["canonical", "legacy", "omit"];

  for (const variant of variants) {
    const payload = buildEmployeeDbPayload(insert, variant);
    const { data, error } = await supabase
      .from("employees")
      .insert(payload)
      .select("id")
      .single();

    if (!error && data) {
      return { data, error: null, variantUsed: variant };
    }

    if (error && isEmployeeFirmSchemaError(error.message ?? "")) {
      continue;
    }

    return { data: null, error, variantUsed: variant };
  }

  return {
    data: null,
    error: {
      message:
        "Could not persist firm group fields — employee firm columns are missing from the PostgREST schema cache." +
        employeeFirmSchemaHint(),
    },
    variantUsed: "omit",
  };
}

export async function updateEmployeeWithFirmColumnFallback(
  supabase: SupabaseClient,
  id: string,
  insert: EmployeeInsert,
  extra: Record<string, unknown> = {}
): Promise<{ error: { message: string } | null; variantUsed: EmployeeFirmColumnVariant }> {
  const variants: EmployeeFirmColumnVariant[] = ["canonical", "legacy", "omit"];

  for (const variant of variants) {
    const payload = { ...buildEmployeeDbPayload(insert, variant), ...extra };
    const { error } = await supabase.from("employees").update(payload).eq("id", id);

    if (!error) {
      return { error: null, variantUsed: variant };
    }

    if (isEmployeeFirmSchemaError(error.message ?? "")) {
      continue;
    }

    return { error, variantUsed: variant };
  }

  return {
    error: {
      message:
        "Could not update firm group fields — employee firm columns are missing from the PostgREST schema cache." +
        employeeFirmSchemaHint(),
    },
    variantUsed: "omit",
  };
}
