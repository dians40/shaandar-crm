/** Split stored full_name into first / last for form and search. */
export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/** Combine first + last into canonical full_name for database storage. */
export function combineEmployeeName(
  firstName: string,
  lastName: string
): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}
