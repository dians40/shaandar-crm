export type UnitConversionRecord = {
  id: string;
  baseUnitId: string;
  baseUnitName: string;
  firstMultiplier: number;
  intermediateUnitId: string;
  intermediateUnitName: string;
  secondMultiplier: number;
  /** Optional third tier for 4-level chains (e.g. Pallet → Carton → Packet → Pieces). */
  tertiaryUnitId: string;
  tertiaryUnitName: string;
  thirdMultiplier: number;
  finalUnitId: string;
  finalUnitName: string;
  totalBaseUnits: number;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_UNIT_CONVERSION_FORM: Omit<
  UnitConversionRecord,
  "id" | "totalBaseUnits" | "createdAt" | "updatedAt"
> = {
  baseUnitId: "",
  baseUnitName: "",
  firstMultiplier: 1,
  intermediateUnitId: "",
  intermediateUnitName: "",
  secondMultiplier: 1,
  tertiaryUnitId: "",
  tertiaryUnitName: "",
  thirdMultiplier: 1,
  finalUnitId: "",
  finalUnitName: "",
};

type LegacyConversionRow = Partial<UnitConversionRecord> & {
  mainUnitId?: string;
  mainUnitName?: string;
  conversionFactor?: number;
  subUnitId?: string;
  subUnitName?: string;
};

export function computeTotalBaseUnits(
  firstMultiplier: number,
  secondMultiplier: number,
  thirdMultiplier: number,
  hasTertiaryTier: boolean
): number {
  const first = Number(firstMultiplier) || 0;
  const second = Number(secondMultiplier) || 0;
  const third = Number(thirdMultiplier) || 0;

  if (hasTertiaryTier) {
    return first * second * third;
  }

  return first * second;
}

export function normalizeUnitConversionRecord(
  row: LegacyConversionRow & Pick<UnitConversionRecord, "id">
): UnitConversionRecord {
  const hasNewShape = Boolean(row.baseUnitId || row.intermediateUnitId);

  if (!hasNewShape && row.mainUnitId) {
    const firstMultiplier = Number(row.conversionFactor) || 0;
    const intermediateUnitId = row.subUnitId ?? "";
    const intermediateUnitName = row.subUnitName ?? "";
    return {
      id: row.id,
      baseUnitId: row.mainUnitId,
      baseUnitName: row.mainUnitName ?? "",
      firstMultiplier,
      intermediateUnitId,
      intermediateUnitName,
      secondMultiplier: 1,
      tertiaryUnitId: "",
      tertiaryUnitName: "",
      thirdMultiplier: 1,
      finalUnitId: intermediateUnitId,
      finalUnitName: intermediateUnitName,
      totalBaseUnits: firstMultiplier,
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    };
  }

  const hasTertiaryTier = Boolean(row.tertiaryUnitId?.trim());
  const firstMultiplier = Number(row.firstMultiplier) || 0;
  const secondMultiplier = Number(row.secondMultiplier) || 0;
  const thirdMultiplier = Number(row.thirdMultiplier) || 0;

  return {
    id: row.id,
    baseUnitId: row.baseUnitId ?? "",
    baseUnitName: row.baseUnitName ?? "",
    firstMultiplier,
    intermediateUnitId: row.intermediateUnitId ?? "",
    intermediateUnitName: row.intermediateUnitName ?? "",
    secondMultiplier,
    tertiaryUnitId: row.tertiaryUnitId ?? "",
    tertiaryUnitName: row.tertiaryUnitName ?? "",
    thirdMultiplier,
    finalUnitId: row.finalUnitId ?? "",
    finalUnitName: row.finalUnitName ?? "",
    totalBaseUnits: computeTotalBaseUnits(
      firstMultiplier,
      secondMultiplier,
      thirdMultiplier,
      hasTertiaryTier
    ),
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateUnitConversionForm(
  form: Omit<UnitConversionRecord, "id" | "totalBaseUnits" | "createdAt" | "updatedAt">
): string | null {
  if (!form.baseUnitId || !form.intermediateUnitId || !form.finalUnitId) {
    return "Base unit, intermediate unit, and final unit are required.";
  }

  const unitIds = [
    form.baseUnitId,
    form.intermediateUnitId,
    form.finalUnitId,
    form.tertiaryUnitId,
  ].filter(Boolean);

  if (new Set(unitIds).size !== unitIds.length) {
    return "Each unit in the chain must be different.";
  }

  if (!form.firstMultiplier || form.firstMultiplier <= 0) {
    return "First multiplier must be greater than zero.";
  }

  if (!form.secondMultiplier || form.secondMultiplier <= 0) {
    return "Second multiplier must be greater than zero.";
  }

  const hasTertiaryTier = Boolean(form.tertiaryUnitId?.trim());
  if (hasTertiaryTier && (!form.thirdMultiplier || form.thirdMultiplier <= 0)) {
    return "Third multiplier must be greater than zero when a third-level unit is set.";
  }

  return null;
}

export function formatChainSummary(record: Pick<
  UnitConversionRecord,
  | "baseUnitName"
  | "firstMultiplier"
  | "intermediateUnitName"
  | "secondMultiplier"
  | "tertiaryUnitName"
  | "thirdMultiplier"
  | "finalUnitName"
  | "totalBaseUnits"
> & { tertiaryUnitId?: string }): string {
  const hasTertiaryTier = Boolean(record.tertiaryUnitId?.trim() && record.tertiaryUnitName);

  if (hasTertiaryTier) {
    return `1 ${record.baseUnitName} contains ${record.firstMultiplier} ${record.intermediateUnitName}, each ${record.intermediateUnitName} contains ${record.secondMultiplier} ${record.tertiaryUnitName}, and each ${record.tertiaryUnitName} contains ${record.thirdMultiplier} ${record.finalUnitName}. Total Base Units = ${record.totalBaseUnits.toLocaleString("en-IN")} ${record.finalUnitName}.`;
  }

  return `1 ${record.baseUnitName} contains ${record.firstMultiplier} ${record.intermediateUnitName}, and each ${record.intermediateUnitName} contains ${record.secondMultiplier} ${record.finalUnitName}. Total Base Units = ${record.totalBaseUnits.toLocaleString("en-IN")} ${record.finalUnitName}.`;
}

export function formatChainShort(record: UnitConversionRecord): string {
  const hasTertiaryTier = Boolean(record.tertiaryUnitId?.trim());

  if (hasTertiaryTier) {
    return `1 ${record.baseUnitName} → ${record.firstMultiplier} ${record.intermediateUnitName} → ${record.secondMultiplier} ${record.tertiaryUnitName} → ${record.thirdMultiplier} ${record.finalUnitName}`;
  }

  return `1 ${record.baseUnitName} → ${record.firstMultiplier} ${record.intermediateUnitName} → ${record.secondMultiplier} ${record.finalUnitName}`;
}
