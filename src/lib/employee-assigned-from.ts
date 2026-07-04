import { ASSIGNED_FIRM_OPTIONS } from "@/constants/employee-options";

export function buildAssignedFromGroupOptions(contractorNames: string[]) {
  const firms = ASSIGNED_FIRM_OPTIONS.map((firm) => ({
    value: firm,
    label: firm,
  }));
  const contractors = contractorNames.map((name) => ({
    value: name,
    label: name,
  }));
  return [...firms, ...contractors];
}

export function isAssignedFirmValue(value: string): boolean {
  return ASSIGNED_FIRM_OPTIONS.includes(value as (typeof ASSIGNED_FIRM_OPTIONS)[number]);
}

export function splitAssignedFromGroup(value: string): {
  assignedFirm: string | null;
  assignedContractor: string | null;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { assignedFirm: null, assignedContractor: null };
  }
  if (isAssignedFirmValue(trimmed)) {
    return { assignedFirm: trimmed, assignedContractor: null };
  }
  return { assignedFirm: null, assignedContractor: trimmed };
}

export function combineAssignedFromGroup(
  assignedFirm: string | null | undefined,
  assignedContractor: string | null | undefined
): string {
  return assignedFirm?.trim() || assignedContractor?.trim() || "";
}
