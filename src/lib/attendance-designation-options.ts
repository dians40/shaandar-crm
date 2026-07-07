export const DEFAULT_DESIGNATION_OPTIONS = [
  "Operator",
  "Supervisor",
  "Manager",
  "Technician",
  "Accountant",
  "HR Executive",
  "Security Guard",
  "Driver",
  "Other",
] as const;

export function mergeDesignationOptions(existing: string[]): string[] {
  const set = new Set<string>(DEFAULT_DESIGNATION_OPTIONS);
  for (const value of existing) {
    const token = value.trim();
    if (token) set.add(token);
  }
  return Array.from(set).sort((left, right) => left.localeCompare(right));
}
