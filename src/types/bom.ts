export type BomRawMaterialLine = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitId: string;
  unitName: string;
};

export type BomByProductLine = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  showValue: boolean;
  valueRate: number;
};

export type BomRecord = {
  id: string;
  bomName: string;
  outputItemId: string;
  outputItemName: string;
  outputQuantity: number;
  outputUnitId: string;
  outputUnitName: string;
  unitExpense: number;
  rawMaterials: BomRawMaterialLine[];
  byProducts: BomByProductLine[];
  createdAt: string;
  updatedAt: string;
};

export type BomFormState = Omit<BomRecord, "id" | "createdAt" | "updatedAt">;

export const EMPTY_BOM_RAW_LINE = (): BomRawMaterialLine => ({
  id: `rm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  itemId: "",
  itemName: "",
  quantity: 0,
  unitId: "",
  unitName: "",
});

export const EMPTY_BOM_BYPRODUCT_LINE = (): BomByProductLine => ({
  id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  itemId: "",
  itemName: "",
  quantity: 0,
  unitId: "",
  unitName: "",
  showValue: false,
  valueRate: 0,
});

export const EMPTY_BOM_FORM: BomFormState = {
  bomName: "",
  outputItemId: "",
  outputItemName: "",
  outputQuantity: 1,
  outputUnitId: "",
  outputUnitName: "",
  unitExpense: 0,
  rawMaterials: [],
  byProducts: [],
};

export function normalizeBomRecord(row: Partial<BomRecord> & Pick<BomRecord, "id">): BomRecord {
  return {
    id: row.id,
    bomName: row.bomName ?? "",
    outputItemId: row.outputItemId ?? "",
    outputItemName: row.outputItemName ?? "",
    outputQuantity: Number(row.outputQuantity) || 0,
    outputUnitId: row.outputUnitId ?? "",
    outputUnitName: row.outputUnitName ?? "",
    unitExpense: Number(row.unitExpense) || 0,
    rawMaterials: Array.isArray(row.rawMaterials) ? row.rawMaterials : [],
    byProducts: Array.isArray(row.byProducts) ? row.byProducts : [],
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateBomForm(form: BomFormState): string | null {
  if (!form.bomName.trim()) return "BOM / Production name is required.";
  if (!form.outputItemId) return "Item to produce is required.";
  if (form.outputQuantity <= 0) return "Output quantity must be greater than zero.";
  if (!form.outputUnitId) return "Output unit is required.";
  if (form.unitExpense < 0) return "Unit expense cannot be negative.";
  return null;
}
