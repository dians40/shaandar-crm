export type UnitConversionRecord = {
  id: string;
  /** Main unit — the only mandatory field. */
  baseUnitId: string;
  baseUnitName: string;
  firstMultiplier: number | null;
  intermediateUnitId: string | null;
  intermediateUnitName: string | null;
  secondMultiplier: number | null;
  finalUnitId: string | null;
  finalUnitName: string | null;
  /** Product of provided multipliers; null when no multipliers are set. */
  totalBaseUnits: number | null;
  createdAt: string;
  updatedAt: string;
};

export type UnitConversionFormState = Omit<
  UnitConversionRecord,
  "id" | "totalBaseUnits" | "createdAt" | "updatedAt"
>;

export const EMPTY_UNIT_CONVERSION_FORM: UnitConversionFormState = {
  baseUnitId: "",
  baseUnitName: "",
  firstMultiplier: null,
  intermediateUnitId: null,
  intermediateUnitName: null,
  secondMultiplier: null,
  finalUnitId: null,
  finalUnitName: null,
};

type LegacyConversionRow = Partial<UnitConversionRecord> & {
  mainUnitId?: string;
  mainUnitName?: string;
  conversionFactor?: number;
  subUnitId?: string;
  subUnitName?: string;
  tertiaryUnitId?: string;
  tertiaryUnitName?: string;
  thirdMultiplier?: number;
};

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str || null;
}

export function computeTotalBaseUnits(
  firstMultiplier: number | null,
  secondMultiplier: number | null
): number | null {
  const first = firstMultiplier ?? 0;
  const second = secondMultiplier ?? 0;

  if (first > 0 && second > 0) return first * second;
  if (first > 0) return first;
  if (second > 0) return second;
  return null;
}

export function normalizeUnitConversionRecord(
  row: LegacyConversionRow & Pick<UnitConversionRecord, "id">
): UnitConversionRecord {
  const hasNewShape = Boolean(row.baseUnitId || row.intermediateUnitId || row.finalUnitId);

  if (!hasNewShape && row.mainUnitId) {
    const firstMultiplier = toOptionalNumber(row.conversionFactor);
    const intermediateUnitId = toOptionalString(row.subUnitId);
    const intermediateUnitName = toOptionalString(row.subUnitName);
    return {
      id: row.id,
      baseUnitId: row.mainUnitId,
      baseUnitName: row.mainUnitName ?? "",
      firstMultiplier,
      intermediateUnitId,
      intermediateUnitName,
      secondMultiplier: null,
      finalUnitId: intermediateUnitId,
      finalUnitName: intermediateUnitName,
      totalBaseUnits: computeTotalBaseUnits(firstMultiplier, null),
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    };
  }

  const firstMultiplier = toOptionalNumber(row.firstMultiplier);
  let secondMultiplier = toOptionalNumber(row.secondMultiplier);
  const intermediateUnitId = toOptionalString(row.intermediateUnitId);
  const intermediateUnitName = toOptionalString(row.intermediateUnitName);
  const finalUnitId = toOptionalString(row.finalUnitId);
  const finalUnitName = toOptionalString(row.finalUnitName);

  // Fold legacy 4-level chains into the flexible 3-tier model while preserving totals.
  const legacyTertiary = toOptionalString(row.tertiaryUnitId);
  const legacyThirdMult = toOptionalNumber(row.thirdMultiplier);
  if (legacyTertiary && secondMultiplier && legacyThirdMult) {
    secondMultiplier = secondMultiplier * legacyThirdMult;
  }

  return {
    id: row.id,
    baseUnitId: row.baseUnitId ?? "",
    baseUnitName: row.baseUnitName ?? "",
    firstMultiplier,
    intermediateUnitId,
    intermediateUnitName,
    secondMultiplier,
    finalUnitId,
    finalUnitName,
    totalBaseUnits: computeTotalBaseUnits(firstMultiplier, secondMultiplier),
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateUnitConversionForm(form: UnitConversionFormState): string | null {
  if (!form.baseUnitId?.trim()) {
    return "Main unit is required.";
  }

  const unitIds = [
    form.baseUnitId,
    form.intermediateUnitId,
    form.finalUnitId,
  ].filter((id): id is string => Boolean(id?.trim()));

  if (new Set(unitIds).size !== unitIds.length) {
    return "Each unit in the chain must be different.";
  }

  if (form.firstMultiplier !== null && form.firstMultiplier <= 0) {
    return "Multiplier 1 must be greater than zero when provided.";
  }

  if (form.secondMultiplier !== null && form.secondMultiplier <= 0) {
    return "Multiplier 2 must be greater than zero when provided.";
  }

  return null;
}

export function formatChainSummary(record: UnitConversionRecord): string {
  const parts: string[] = [`Main unit: ${record.baseUnitName}.`];

  if (record.firstMultiplier && record.firstMultiplier > 0) {
    if (record.intermediateUnitName) {
      parts.push(
        `1 ${record.baseUnitName} = ${record.firstMultiplier} ${record.intermediateUnitName}.`
      );
    } else if (record.finalUnitName) {
      parts.push(
        `1 ${record.baseUnitName} = ${record.firstMultiplier} ${record.finalUnitName}.`
      );
    } else {
      parts.push(`Multiplier 1: ${record.firstMultiplier}.`);
    }
  }

  if (
    record.secondMultiplier &&
    record.secondMultiplier > 0 &&
    record.intermediateUnitName &&
    record.finalUnitName
  ) {
    parts.push(
      `Each ${record.intermediateUnitName} = ${record.secondMultiplier} ${record.finalUnitName}.`
    );
  } else if (
    record.secondMultiplier &&
    record.secondMultiplier > 0 &&
    !record.intermediateUnitName &&
    record.finalUnitName
  ) {
    parts.push(`Multiplier 2: ${record.secondMultiplier} ${record.finalUnitName}.`);
  }

  if (record.totalBaseUnits !== null && record.totalBaseUnits > 0) {
    const targetUnit =
      record.finalUnitName ?? record.intermediateUnitName ?? record.baseUnitName;
    parts.push(
      `Total = ${record.totalBaseUnits.toLocaleString("en-IN")} ${targetUnit}.`
    );
  }

  return parts.join(" ");
}

export function formatChainShort(record: UnitConversionRecord): string {
  const segments: string[] = [`1 ${record.baseUnitName}`];

  if (record.firstMultiplier && record.firstMultiplier > 0) {
    const target = record.intermediateUnitName ?? record.finalUnitName ?? "?";
    segments.push(`${record.firstMultiplier} ${target}`);
  }

  if (
    record.secondMultiplier &&
    record.secondMultiplier > 0 &&
    record.intermediateUnitName &&
    record.finalUnitName
  ) {
    segments.push(`${record.secondMultiplier} ${record.finalUnitName}`);
  }

  return segments.join(" → ");
}

export function formatTotalBaseUnits(record: UnitConversionRecord): string {
  if (record.totalBaseUnits === null || record.totalBaseUnits <= 0) {
    return "—";
  }

  const unit =
    record.finalUnitName ?? record.intermediateUnitName ?? record.baseUnitName;
  return `${record.totalBaseUnits.toLocaleString("en-IN")} ${unit}`;
}

export function buildConversionPayload(
  form: UnitConversionFormState
): Omit<UnitConversionRecord, "id" | "createdAt" | "updatedAt"> {
  const firstMultiplier = form.firstMultiplier;
  const secondMultiplier = form.secondMultiplier;

  return {
    baseUnitId: form.baseUnitId,
    baseUnitName: form.baseUnitName,
    firstMultiplier,
    intermediateUnitId: form.intermediateUnitId,
    intermediateUnitName: form.intermediateUnitName,
    secondMultiplier,
    finalUnitId: form.finalUnitId,
    finalUnitName: form.finalUnitName,
    totalBaseUnits: computeTotalBaseUnits(firstMultiplier, secondMultiplier),
  };
}

export function recordToFormState(record: UnitConversionRecord): UnitConversionFormState {
  return {
    baseUnitId: record.baseUnitId,
    baseUnitName: record.baseUnitName,
    firstMultiplier: record.firstMultiplier,
    intermediateUnitId: record.intermediateUnitId,
    intermediateUnitName: record.intermediateUnitName,
    secondMultiplier: record.secondMultiplier,
    finalUnitId: record.finalUnitId,
    finalUnitName: record.finalUnitName,
  };
}
