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
  /** Snapshot multipliers from linked formula — used for stock calculation. */
  conversionFirstMultiplier: number | null;
  conversionSecondMultiplier: number | null;
  conversionThirdMultiplier: number | null;
  conversionTotalBaseUnits: number | null;
  openingStockQuantity: number;
  openingStockValue: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  reorderLevel: number;
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
  conversionFirstMultiplier: null,
  conversionSecondMultiplier: null,
  conversionThirdMultiplier: null,
  conversionTotalBaseUnits: null,
  openingStockQuantity: 0,
  openingStockValue: 0,
  minimumStockLevel: 0,
  maximumStockLevel: 0,
  reorderLevel: 0,
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
    conversionFirstMultiplier:
      row.conversionFirstMultiplier === null || row.conversionFirstMultiplier === undefined
        ? null
        : Number(row.conversionFirstMultiplier) || null,
    conversionSecondMultiplier:
      row.conversionSecondMultiplier === null || row.conversionSecondMultiplier === undefined
        ? null
        : Number(row.conversionSecondMultiplier) || null,
    conversionThirdMultiplier:
      row.conversionThirdMultiplier === null || row.conversionThirdMultiplier === undefined
        ? null
        : Number(row.conversionThirdMultiplier) || null,
    conversionTotalBaseUnits:
      row.conversionTotalBaseUnits === null || row.conversionTotalBaseUnits === undefined
        ? null
        : Number(row.conversionTotalBaseUnits) || null,
    openingStockQuantity: Number(row.openingStockQuantity) || 0,
    openingStockValue: Number(row.openingStockValue) || 0,
    minimumStockLevel: Number(row.minimumStockLevel) || 0,
    maximumStockLevel: Number(row.maximumStockLevel) || 0,
    reorderLevel: Number(row.reorderLevel) || 0,
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
    { label: "Minimum stock level", value: form.minimumStockLevel },
    { label: "Maximum stock level", value: form.maximumStockLevel },
    { label: "Reorder level", value: form.reorderLevel },
    { label: "Purchase rate", value: form.purchaseRate },
    { label: "Sales rate / MRP", value: form.salesRateMrp },
  ];

  for (const field of numericFields) {
    if (field.value < 0) return `${field.label} cannot be negative.`;
  }

  if (
    form.maximumStockLevel > 0 &&
    form.minimumStockLevel > form.maximumStockLevel
  ) {
    return "Minimum stock level cannot exceed maximum stock level.";
  }

  if (form.reorderLevel > 0 && form.reorderLevel < form.minimumStockLevel) {
    return "Reorder level cannot be below minimum stock level.";
  }

  if (
    form.maximumStockLevel > 0 &&
    form.reorderLevel > form.maximumStockLevel
  ) {
    return "Reorder level cannot exceed maximum stock level.";
  }

  return null;
}
