export type UnitRecord = {
  id: string;
  name: string;
  nameHindi: string;
  shortCode: string;
  isSystemSeed: boolean;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_UNIT_FORM: Omit<
  UnitRecord,
  "id" | "isSystemSeed" | "createdAt" | "updatedAt"
> = {
  name: "",
  nameHindi: "",
  shortCode: "",
};

export function normalizeUnitRecord(
  row: Partial<UnitRecord> & Pick<UnitRecord, "id">
): UnitRecord {
  return {
    id: row.id,
    name: row.name ?? "",
    nameHindi: "",
    shortCode: row.shortCode ?? "",
    isSystemSeed: Boolean(row.isSystemSeed),
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateUnitForm(
  form: Omit<UnitRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">,
  existingNames: string[],
  editingName?: string
): string | null {
  if (!form.name.trim()) return "Unit name is required.";
  if (!form.shortCode.trim()) return "Short code is required.";

  const duplicate = existingNames.some(
    (name) =>
      name.toLowerCase() === form.name.trim().toLowerCase() &&
      name.toLowerCase() !== (editingName ?? "").toLowerCase()
  );
  if (duplicate) return "A unit with this name already exists.";

  return null;
}
