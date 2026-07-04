import type { StatutoryStatus } from "@/types/employee-form";

export const STATUTORY_STATUS_OPTIONS: StatutoryStatus[] = ["Active", "Non-Active"];

export function isStatutoryActive(
  status: StatutoryStatus | "" | boolean | null | undefined
): boolean {
  if (typeof status === "boolean") return status;
  return status === "Active";
}

export function statutoryStatusFromEnabled(
  enabled: boolean | null | undefined
): StatutoryStatus {
  return enabled ? "Active" : "Non-Active";
}

/** Prefer text column; fall back to legacy boolean when migrating older rows. */
export function parseStatutoryStatusFromDb(
  status: string | null | undefined,
  legacyEnabled?: boolean | null
): StatutoryStatus {
  if (status === "Active" || status === "Non-Active") return status;
  return statutoryStatusFromEnabled(legacyEnabled);
}

export function formatStatutoryStatusLabel(
  status: StatutoryStatus | "" | boolean | null | undefined
): string {
  if (typeof status === "boolean") {
    return status ? "Active" : "Non-Active";
  }
  return status || "—";
}
