export function mergeDepartmentOptions(
  existing: string[],
  masterDepartments: readonly string[] = []
): string[] {
  const set = new Set<string>();
  for (const value of masterDepartments) {
    const token = value.trim();
    if (token) set.add(token);
  }
  for (const value of existing) {
    const token = value.trim();
    if (token) set.add(token);
  }
  return Array.from(set).sort((left, right) => left.localeCompare(right));
}
