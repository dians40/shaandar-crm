export type AccountGroupNature =
  | "Asset"
  | "Liability"
  | "Income"
  | "Expense"
  | "Revenue";

export type AccountGroupCategory =
  | "ASSETS"
  | "LIABILITIES"
  | "INCOME"
  | "EXPENSES"
  | "REVENUE";

export const PRIMARY_PARENT_VALUE = "Primary";

export type AccountGroupRecord = {
  id: string;
  name: string;
  parentGroup: string;
  nature: AccountGroupNature;
  category: AccountGroupCategory;
  isSystemSeed: boolean;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_ACCOUNT_GROUP_FORM: Omit<
  AccountGroupRecord,
  "id" | "isSystemSeed" | "createdAt" | "updatedAt"
> = {
  name: "",
  parentGroup: PRIMARY_PARENT_VALUE,
  nature: "Asset",
  category: "ASSETS",
};

export function normalizeAccountGroupRecord(
  row: Partial<AccountGroupRecord> & Pick<AccountGroupRecord, "id">
): AccountGroupRecord {
  return {
    id: row.id,
    name: row.name ?? "",
    parentGroup: row.parentGroup ?? PRIMARY_PARENT_VALUE,
    nature: row.nature ?? "Asset",
    category: row.category ?? "ASSETS",
    isSystemSeed: Boolean(row.isSystemSeed),
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateAccountGroupForm(
  form: Omit<AccountGroupRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">,
  existingNames: string[],
  editingName?: string
): string | null {
  const trimmed = form.name.trim();
  if (!trimmed) return "Group name is required.";

  const duplicate = existingNames.some(
    (name) =>
      name.toLowerCase() === trimmed.toLowerCase() &&
      name.toLowerCase() !== (editingName ?? "").toLowerCase()
  );
  if (duplicate) return "An account group with this name already exists.";

  if (!form.parentGroup.trim()) return "Parent group is required.";

  return null;
}

export const NATURE_OPTIONS: AccountGroupNature[] = [
  "Asset",
  "Liability",
  "Income",
  "Expense",
  "Revenue",
];

export const CATEGORY_FOR_NATURE: Record<AccountGroupNature, AccountGroupCategory> = {
  Asset: "ASSETS",
  Liability: "LIABILITIES",
  Income: "INCOME",
  Expense: "EXPENSES",
  Revenue: "REVENUE",
};
