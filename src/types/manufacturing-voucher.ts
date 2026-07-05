import type { BomRawMaterialLine, BomUnitExpenseLine } from "@/types/bom";

export type ManufacturingVoucherRecord = {
  id: string;
  productionRunId: string;
  productionDate: string;
  bomId: string;
  bomName: string;
  outputItemId: string;
  outputItemName: string;
  outputQuantity: number;
  outputUnitName: string;
  outputUnitFormula: string;
  productionVolume: number;
  rawMaterials: BomRawMaterialLine[];
  unitExpenses: BomUnitExpenseLine[];
  totalUnitExpense: number;
  createdAt: string;
  updatedAt: string;
};

export type ManufacturingVoucherFormState = Omit<
  ManufacturingVoucherRecord,
  "id" | "totalUnitExpense" | "createdAt" | "updatedAt"
>;

export function emptyManufacturingVoucherForm(): ManufacturingVoucherFormState {
  return {
    productionRunId: "",
    productionDate: new Date().toISOString().slice(0, 10),
    bomId: "",
    bomName: "",
    outputItemId: "",
    outputItemName: "",
    outputQuantity: 0,
    outputUnitName: "",
    outputUnitFormula: "",
    productionVolume: 1,
    rawMaterials: [],
    unitExpenses: [],
  };
}

export function normalizeManufacturingVoucherRecord(
  row: Partial<ManufacturingVoucherRecord> & Pick<ManufacturingVoucherRecord, "id">
): ManufacturingVoucherRecord {
  const unitExpenses = Array.isArray(row.unitExpenses) ? row.unitExpenses : [];
  const totalUnitExpense = unitExpenses.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0
  );

  return {
    id: row.id,
    productionRunId: row.productionRunId ?? "",
    productionDate: row.productionDate ?? new Date().toISOString().slice(0, 10),
    bomId: row.bomId ?? "",
    bomName: row.bomName ?? "",
    outputItemId: row.outputItemId ?? "",
    outputItemName: row.outputItemName ?? "",
    outputQuantity: Number(row.outputQuantity) || 0,
    outputUnitName: row.outputUnitName ?? "",
    outputUnitFormula: row.outputUnitFormula ?? "",
    productionVolume: Number(row.productionVolume) || 1,
    rawMaterials: Array.isArray(row.rawMaterials) ? row.rawMaterials : [],
    unitExpenses,
    totalUnitExpense,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function recordToManufacturingForm(
  record: ManufacturingVoucherRecord
): ManufacturingVoucherFormState {
  return {
    productionRunId: record.productionRunId,
    productionDate: record.productionDate,
    bomId: record.bomId,
    bomName: record.bomName,
    outputItemId: record.outputItemId,
    outputItemName: record.outputItemName,
    outputQuantity: record.outputQuantity,
    outputUnitName: record.outputUnitName,
    outputUnitFormula: record.outputUnitFormula,
    productionVolume: record.productionVolume,
    rawMaterials: record.rawMaterials,
    unitExpenses: record.unitExpenses,
  };
}

export function validateManufacturingVoucherForm(
  form: ManufacturingVoucherFormState
): string | null {
  if (!form.productionRunId.trim()) return "Production / Manufacturing Run ID is required.";
  if (!form.productionDate.trim()) return "Date is required.";
  if (!form.bomId) return "BOM rule selection is required.";
  if (form.productionVolume <= 0) return "Production volume must be greater than zero.";
  if (form.rawMaterials.filter((row) => row.itemId && row.quantity > 0).length === 0) {
    return "Selected BOM has no raw materials.";
  }
  return null;
}

export function scaleRawMaterialsForVolume(
  lines: BomRawMaterialLine[],
  bomOutputQuantity: number,
  productionVolume: number
): BomRawMaterialLine[] {
  if (bomOutputQuantity <= 0) return lines;
  const factor = productionVolume / bomOutputQuantity;
  return lines.map((row) => ({
    ...row,
    quantity: Math.round(row.quantity * factor * 1000) / 1000,
    locked: true,
  }));
}
