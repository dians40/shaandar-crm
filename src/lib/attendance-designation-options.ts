import { DEFAULT_DESIGNATION_SEEDS } from "@/types/general-settings";

export const DEFAULT_DESIGNATION_OPTIONS = DEFAULT_DESIGNATION_SEEDS;

export function mergeDesignationOptions(
  existing: string[],
  masterDesignations: readonly string[] = DEFAULT_DESIGNATION_SEEDS
): string[] {
  const set = new Set<string>();
  for (const value of masterDesignations) {
    const token = value.trim();
    if (token) set.add(token);
  }
  for (const value of existing) {
    const token = value.trim();
    if (token) set.add(token);
  }
  return Array.from(set).sort((left, right) => left.localeCompare(right));
}
