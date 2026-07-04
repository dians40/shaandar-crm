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

export const LIST_SEARCH_EMPTY_MESSAGE = "No records found matching your search.";
