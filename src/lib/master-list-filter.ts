export type MasterListFilterState = {
  searchQuery: string;
  departmentFilter: string;
  designationFilter: string;
};

export const EMPTY_MASTER_LIST_FILTERS: MasterListFilterState = {
  searchQuery: "",
  departmentFilter: "",
  designationFilter: "",
};

const activeMasterListFilters: { current: MasterListFilterState } = {
  current: EMPTY_MASTER_LIST_FILTERS,
};

export function bindMasterListFilters(filters: MasterListFilterState): void {
  activeMasterListFilters.current = filters;
}

export function readActiveMasterListFilters(): MasterListFilterState {
  return activeMasterListFilters.current;
}

/** Blank selection matches all rows; otherwise exact match on trimmed value. */
export function matchesOptionalExactFilter(
  selected: string,
  rowValue: string | null | undefined,
  options?: { skipIfRowValueAbsent?: boolean }
): boolean {
  const token = selected.trim();
  if (!token) return true;

  const rowToken = String(rowValue ?? "").trim();
  if (!rowToken && options?.skipIfRowValueAbsent) return true;
  return rowToken === token;
}

export type MultiCriteriaFilterInput = {
  searchQuery: string;
  departmentFilter?: string;
  designationFilter?: string;
  primaryName?: string | null;
  textValues?: Array<string | number | null | undefined>;
  department?: string | null;
  designation?: string | null;
  skipDepartmentIfAbsent?: boolean;
  skipDesignationIfAbsent?: boolean;
};

function matchesTextSearch(input: MultiCriteriaFilterInput): boolean {
  const normalized = input.searchQuery.trim().toLowerCase();
  if (!normalized) return true;

  if (
    input.primaryName &&
    String(input.primaryName).toLowerCase().includes(normalized)
  ) {
    return true;
  }

  return (input.textValues ?? [])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .some((value) => String(value).toLowerCase().includes(normalized));
}

/** text_match AND department_match AND designation_match — each optional when blank. */
export function matchesMultiCriteriaFilter(input: MultiCriteriaFilterInput): boolean {
  const textMatch = matchesTextSearch(input);

  const departmentMatch = matchesOptionalExactFilter(
    input.departmentFilter ?? "",
    input.department,
    { skipIfRowValueAbsent: input.skipDepartmentIfAbsent }
  );

  const designationMatch = matchesOptionalExactFilter(
    input.designationFilter ?? "",
    input.designation,
    { skipIfRowValueAbsent: input.skipDesignationIfAbsent }
  );

  return textMatch && departmentMatch && designationMatch;
}

export function filterMasterListRecords<T>(
  records: T[],
  filters: MasterListFilterState,
  resolve: (record: T) => {
    primaryName?: string | null;
    textValues?: Array<string | number | null | undefined>;
    department?: string | null;
    designation?: string | null;
    skipDepartmentIfAbsent?: boolean;
    skipDesignationIfAbsent?: boolean;
  }
): T[] {
  return records.filter((record) => {
    const resolved = resolve(record);
    return matchesMultiCriteriaFilter({
      searchQuery: filters.searchQuery,
      departmentFilter: filters.departmentFilter,
      designationFilter: filters.designationFilter,
      primaryName: resolved.primaryName,
      textValues: resolved.textValues,
      department: resolved.department,
      designation: resolved.designation,
      skipDepartmentIfAbsent: resolved.skipDepartmentIfAbsent,
      skipDesignationIfAbsent: resolved.skipDesignationIfAbsent,
    });
  });
}
