export type BomRawMaterialLine = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  locked: boolean;
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

export type BomUnitExpenseLine = {
  id: string;
  label: string;
  amount: number;
};

export type BomRecord = {
  id: string;
  bomName: string;
  outputItemId: string;
  outputItemName: string;
  outputQuantity: number;
  outputUnitId: string;
  outputUnitName: string;
  outputUnitConversionId: string;
  unitExpense: number;
  unitExpenses: BomUnitExpenseLine[];
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
  locked: false,
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

export const EMPTY_BOM_UNIT_EXPENSE_LINE = (): BomUnitExpenseLine => ({
  id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: "",
  amount: 0,
});

export const EMPTY_BOM_FORM: BomFormState = {
  bomName: "",
  outputItemId: "",
  outputItemName: "",
  outputQuantity: 1,
  outputUnitId: "",
  outputUnitName: "",
  outputUnitConversionId: "",
  unitExpense: 0,
  unitExpenses: [EMPTY_BOM_UNIT_EXPENSE_LINE()],
  rawMaterials: [],
  byProducts: [EMPTY_BOM_BYPRODUCT_LINE()],
};

function sumUnitExpenses(lines: BomUnitExpenseLine[]): number {
  return lines.reduce((total, line) => total + (Number(line.amount) || 0), 0);
}

function normalizeRawLine(line: Partial<BomRawMaterialLine>): BomRawMaterialLine {
  return {
    id: line.id ?? EMPTY_BOM_RAW_LINE().id,
    itemId: line.itemId ?? "",
    itemName: line.itemName ?? "",
    quantity: Number(line.quantity) || 0,
    unitId: line.unitId ?? "",
    unitName: line.unitName ?? "",
    locked: Boolean(line.locked),
  };
}

function normalizeExpenseLine(line: Partial<BomUnitExpenseLine>): BomUnitExpenseLine {
  return {
    id: line.id ?? EMPTY_BOM_UNIT_EXPENSE_LINE().id,
    label: line.label ?? "",
    amount: Number(line.amount) || 0,
  };
}

export function normalizeBomRecord(row: Partial<BomRecord> & Pick<BomRecord, "id">): BomRecord {
  const unitExpenses = Array.isArray(row.unitExpenses)
    ? row.unitExpenses.map(normalizeExpenseLine)
    : row.unitExpense
      ? [{ id: "legacy-expense", label: "Unit Expense", amount: Number(row.unitExpense) || 0 }]
      : [EMPTY_BOM_UNIT_EXPENSE_LINE()];

  const rawMaterials = Array.isArray(row.rawMaterials)
    ? row.rawMaterials.map(normalizeRawLine)
    : [];

  const byProducts = Array.isArray(row.byProducts)
    ? row.byProducts
    : [];

  return {
    id: row.id,
    bomName: row.bomName ?? "",
    outputItemId: row.outputItemId ?? "",
    outputItemName: row.outputItemName ?? "",
    outputQuantity: Number(row.outputQuantity) || 0,
    outputUnitId: row.outputUnitId ?? "",
    outputUnitName: row.outputUnitName ?? "",
    outputUnitConversionId: row.outputUnitConversionId ?? "",
    unitExpense: sumUnitExpenses(unitExpenses),
    unitExpenses,
    rawMaterials,
    byProducts: byProducts.length > 0 ? byProducts : [EMPTY_BOM_BYPRODUCT_LINE()],
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateBomForm(form: BomFormState): string | null {
  if (!form.bomName.trim()) return "BOM / Production name is required.";
  if (!form.outputItemId) return "Item to produce is required.";
  if (form.outputQuantity <= 0) return "Output quantity must be greater than zero.";
  if (!form.outputUnitConversionId && !form.outputUnitId) {
    return "Output unit is required.";
  }
  const totalExpense = sumUnitExpenses(form.unitExpenses);
  if (totalExpense < 0) return "Unit expenses cannot be negative.";
  return null;
}

export function lockRawMaterialLines(lines: BomRawMaterialLine[]): BomRawMaterialLine[] {
  return lines.map((line) =>
    line.itemId && line.quantity > 0 ? { ...line, locked: true } : line
  );
}

export function isByProductRowFilled(line: BomByProductLine): boolean {
  return Boolean(line.itemId.trim()) && line.quantity > 0;
}

export function ensureTrailingByProductRow(lines: BomByProductLine[]): BomByProductLine[] {
  if (lines.length === 0) return [EMPTY_BOM_BYPRODUCT_LINE()];
  const last = lines[lines.length - 1];
  if (isByProductRowFilled(last)) {
    return [...lines, EMPTY_BOM_BYPRODUCT_LINE()];
  }
  return lines;
}

export function computeTotalUnitExpense(lines: BomUnitExpenseLine[]): number {
  return sumUnitExpenses(lines);
}
