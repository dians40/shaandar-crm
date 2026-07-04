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
  additionalValues: Array<string | number | null | undefined> = []
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const nameMatch = primaryName
    ? String(primaryName).toLowerCase().includes(normalized)
    : false;

  return nameMatch || matchesListSearch(query, additionalValues);
}

export const LIST_SEARCH_EMPTY_MESSAGE = "No records found matching your search.";
