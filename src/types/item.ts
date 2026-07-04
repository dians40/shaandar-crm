export const GST_TAX_OPTIONS = ["0", "5", "12", "18", "28"] as const;

export type GstTaxPercentage = (typeof GST_TAX_OPTIONS)[number];

export type ItemRecord = {
  id: string;
  itemName: string;
  itemGroupId: string;
  itemGroupName: string;
  primaryUnitId: string;
  primaryUnitName: string;
  alternateUnitId: string;
  alternateUnitName: string;
  /** Linked Unit Conversion Master formula id (optional). */
  unitConversionId: string;
  openingStockQuantity: number;
  openingStockValue: number;
  purchaseRate: number;
  salesRateMrp: number;
  gstTaxPercentage: string;
  hsnCode: string;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_ITEM_FORM: Omit<ItemRecord, "id" | "createdAt" | "updatedAt"> = {
  itemName: "",
  itemGroupId: "",
  itemGroupName: "",
  primaryUnitId: "",
  primaryUnitName: "",
  alternateUnitId: "",
  alternateUnitName: "",
  unitConversionId: "",
  openingStockQuantity: 0,
  openingStockValue: 0,
  purchaseRate: 0,
  salesRateMrp: 0,
  gstTaxPercentage: "18",
  hsnCode: "",
};

export function normalizeItemRecord(
  row: Partial<ItemRecord> & Pick<ItemRecord, "id">
): ItemRecord {
  return {
    id: row.id,
    itemName: row.itemName ?? "",
    itemGroupId: row.itemGroupId ?? "",
    itemGroupName: row.itemGroupName ?? "",
    primaryUnitId: row.primaryUnitId ?? "",
    primaryUnitName: row.primaryUnitName ?? "",
    alternateUnitId: row.alternateUnitId ?? "",
    alternateUnitName: row.alternateUnitName ?? "",
    unitConversionId: row.unitConversionId ?? "",
    openingStockQuantity: Number(row.openingStockQuantity) || 0,
    openingStockValue: Number(row.openingStockValue) || 0,
    purchaseRate: Number(row.purchaseRate) || 0,
    salesRateMrp: Number(row.salesRateMrp) || 0,
    gstTaxPercentage: row.gstTaxPercentage ?? "18",
    hsnCode: row.hsnCode ?? "",
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateItemForm(
  form: Omit<ItemRecord, "id" | "createdAt" | "updatedAt">
): string | null {
  if (!form.itemName.trim()) return "Item name is required.";
  if (!form.itemGroupId) return "Item group is required.";
  if (!form.primaryUnitId) return "Primary unit is required.";

  const numericFields = [
    { label: "Opening stock quantity", value: form.openingStockQuantity },
    { label: "Opening stock value", value: form.openingStockValue },
    { label: "Purchase rate", value: form.purchaseRate },
    { label: "Sales rate / MRP", value: form.salesRateMrp },
  ];

  for (const field of numericFields) {
    if (field.value < 0) return `${field.label} cannot be negative.`;
  }

  return null;
}
