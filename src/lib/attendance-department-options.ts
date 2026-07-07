export const DEFAULT_DEPARTMENT_OPTIONS = [
  "Production",
  "HR",
  "Administration",
  "Finance",
  "Maintenance",
  "Security",
  "Logistics",
  "Quality Control",
  "Other",
] as const;

export function mergeDepartmentOptions(
  existing: string[],
  masterDepartments: readonly string[] = DEFAULT_DEPARTMENT_OPTIONS
): string[] {
  const set = new Set<string>(masterDepartments);
  for (const value of existing) {
    const token = value.trim();
    if (token) set.add(token);
  }
  return Array.from(set).sort((left, right) => left.localeCompare(right));
}
