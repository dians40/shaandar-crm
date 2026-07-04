export type UnitConversionRecord = {
  id: string;
  mainUnitId: string;
  mainUnitName: string;
  conversionFactor: number;
  subUnitId: string;
  subUnitName: string;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_UNIT_CONVERSION_FORM: Omit<
  UnitConversionRecord,
  "id" | "createdAt" | "updatedAt"
> = {
  mainUnitId: "",
  mainUnitName: "",
  conversionFactor: 1,
  subUnitId: "",
  subUnitName: "",
};

export function normalizeUnitConversionRecord(
  row: Partial<UnitConversionRecord> & Pick<UnitConversionRecord, "id">
): UnitConversionRecord {
  return {
    id: row.id,
    mainUnitId: row.mainUnitId ?? "",
    mainUnitName: row.mainUnitName ?? "",
    conversionFactor: Number(row.conversionFactor) || 0,
    subUnitId: row.subUnitId ?? "",
    subUnitName: row.subUnitName ?? "",
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateUnitConversionForm(
  form: Omit<UnitConversionRecord, "id" | "createdAt" | "updatedAt">
): string | null {
  if (!form.mainUnitId || !form.subUnitId) {
    return "Main unit and sub-unit are required.";
  }
  if (form.mainUnitId === form.subUnitId) {
    return "Main unit and sub-unit must be different.";
  }
  if (!form.conversionFactor || form.conversionFactor <= 0) {
    return "Conversion factor must be greater than zero.";
  }
  return null;
}

export function formatConversionFormula(
  mainUnitName: string,
  factor: number,
  subUnitName: string
): string {
  return `1 ${mainUnitName} = ${factor} ${subUnitName}`;
}
