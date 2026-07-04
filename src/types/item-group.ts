export const ITEM_GROUP_PRIMARY_PARENT = "Primary";

export type ItemGroupRecord = {
  id: string;
  name: string;
  parentGroup: string;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_ITEM_GROUP_FORM: Omit<
  ItemGroupRecord,
  "id" | "createdAt" | "updatedAt"
> = {
  name: "",
  parentGroup: ITEM_GROUP_PRIMARY_PARENT,
};

export function normalizeItemGroupRecord(
  row: Partial<ItemGroupRecord> & Pick<ItemGroupRecord, "id">
): ItemGroupRecord {
  return {
    id: row.id,
    name: row.name ?? "",
    parentGroup: row.parentGroup ?? ITEM_GROUP_PRIMARY_PARENT,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateItemGroupForm(
  form: Omit<ItemGroupRecord, "id" | "createdAt" | "updatedAt">,
  existingNames: string[],
  editingName?: string
): string | null {
  if (!form.name.trim()) return "Group name is required.";
  if (!form.parentGroup.trim()) return "Parent group is required.";

  const duplicate = existingNames.some(
    (name) =>
      name.toLowerCase() === form.name.trim().toLowerCase() &&
      name.toLowerCase() !== (editingName ?? "").toLowerCase()
  );
  if (duplicate) return "An item group with this name already exists.";

  return null;
}
