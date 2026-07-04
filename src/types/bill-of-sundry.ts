export type SundryNatureType = "plus" | "minus";
export type SundryCalculationType = "percentage" | "absolute";

export type BillOfSundryRecord = {
  id: string;
  sundryName: string;
  natureType: SundryNatureType;
  calculationType: SundryCalculationType;
  accountGroupId: string;
  accountGroupName: string;
  isSystemSeed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BillOfSundryFormState = Omit<
  BillOfSundryRecord,
  "id" | "isSystemSeed" | "createdAt" | "updatedAt"
>;

export const EMPTY_BILL_OF_SUNDRIES_FORM: BillOfSundryFormState = {
  sundryName: "",
  natureType: "plus",
  calculationType: "percentage",
  accountGroupId: "",
  accountGroupName: "",
};

export function normalizeBillOfSundryRecord(
  row: Partial<BillOfSundryRecord> & Pick<BillOfSundryRecord, "id">
): BillOfSundryRecord {
  return {
    id: row.id,
    sundryName: row.sundryName ?? "",
    natureType: row.natureType === "minus" ? "minus" : "plus",
    calculationType: row.calculationType === "absolute" ? "absolute" : "percentage",
    accountGroupId: row.accountGroupId ?? "",
    accountGroupName: row.accountGroupName ?? "",
    isSystemSeed: Boolean(row.isSystemSeed),
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateBillOfSundryForm(form: BillOfSundryFormState): string | null {
  if (!form.sundryName.trim()) return "Sundry name is required.";
  if (!form.accountGroupId) return "Account group link is required.";
  return null;
}
