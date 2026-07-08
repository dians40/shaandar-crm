import { matchesMultiCriteriaFilter, readActiveMasterListFilters } from "@/lib/master-list-filter";

/** Client-side list search — does not mutate stored records. */
export function matchesListSearch(
  query: string,
  values: Array<string | number | null | undefined>
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return values
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .some((value) => String(value).toLowerCase().includes(normalized));
}

/** Prioritize name-like fields for universal name search across modules. */
export function matchesUniversalNameSearch(
  query: string,
  primaryName: string | null | undefined,
  additionalValues: Array<string | number | null | undefined> = [],
  extended?: {
    departmentFilter?: string;
    designationFilter?: string;
    department?: string | null;
    designation?: string | null;
    skipDepartmentIfAbsent?: boolean;
    skipDesignationIfAbsent?: boolean;
  }
): boolean {
  const activeFilters = readActiveMasterListFilters();
  const departmentFilter = extended?.departmentFilter ?? activeFilters.departmentFilter;
  const designationFilter = extended?.designationFilter ?? activeFilters.designationFilter;
  const shouldApplyExtended =
    Boolean(extended) ||
    Boolean(departmentFilter) ||
    Boolean(designationFilter) ||
    extended?.department !== undefined ||
    extended?.designation !== undefined;

  if (!shouldApplyExtended) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;

    const nameMatch = primaryName
      ? String(primaryName).toLowerCase().includes(normalized)
      : false;

    return nameMatch || matchesListSearch(query, additionalValues);
  }

  return matchesMultiCriteriaFilter({
    searchQuery: query,
    primaryName,
    textValues: additionalValues,
    departmentFilter,
    designationFilter,
    department: extended?.department,
    designation: extended?.designation,
    skipDepartmentIfAbsent: extended?.skipDepartmentIfAbsent ?? true,
    skipDesignationIfAbsent: extended?.skipDesignationIfAbsent ?? true,
  });
}

export const LIST_SEARCH_EMPTY_MESSAGE = "No records found matching your search.";

export { matchesMultiCriteriaFilter, filterMasterListRecords, readActiveMasterListFilters } from "@/lib/master-list-filter";
