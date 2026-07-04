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

function hasPositiveMultiplier(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

const CHAIN_ARROW = " ➔ ";

export type ConversionDisplayChain = {
  baseUnitName: string;
  multiplier1: number | null;
  intermediateUnit: string | null;
  multiplier2: number | null;
  finalUnit: string | null;
  total: number | null;
  isThreeTier: boolean;
};

function resolveUnitName(
  unitId: string | null | undefined,
  unitName: string | null | undefined,
  unitNameById: Record<string, string>
): string | null {
  const trimmedName = unitName?.trim();
  if (trimmedName) return trimmedName;
  if (unitId?.trim()) return unitNameById[unitId] ?? null;
  return null;
}

/** Hydrate chain fields from stored state so intermediate tiers never disappear in UI. */
export function resolveConversionDisplay(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): ConversionDisplayChain {
  const baseUnitName = record.baseUnitName?.trim() || "—";
  const multiplier1 = hasPositiveMultiplier(record.firstMultiplier)
    ? record.firstMultiplier
    : null;
  const multiplier2 = hasPositiveMultiplier(record.secondMultiplier)
    ? record.secondMultiplier
    : null;
  const intermediateUnit = resolveUnitName(
    record.intermediateUnitId,
    record.intermediateUnitName,
    unitNameById
  );
  const finalUnit = resolveUnitName(record.finalUnitId, record.finalUnitName, unitNameById);
  const total = computeTotalBaseUnits(record.firstMultiplier, record.secondMultiplier);

  const isThreeTier = Boolean(
    multiplier1 != null &&
      intermediateUnit &&
      multiplier2 != null &&
      finalUnit &&
      intermediateUnit !== finalUnit
  );

  return {
    baseUnitName,
    multiplier1,
    intermediateUnit,
    multiplier2,
    finalUnit,
    total,
    isThreeTier,
  };
}

export function computeTotalBaseUnits(
  firstMultiplier: number | null | undefined,
  secondMultiplier: number | null | undefined
): number | null {
  const first = hasPositiveMultiplier(firstMultiplier) ? firstMultiplier : null;
  const second = hasPositiveMultiplier(secondMultiplier) ? secondMultiplier : null;

  if (first != null && second != null) return first * second;
  if (first != null) return first;
  if (second != null) return second;
  return null;
}

/** Recompute total from live fields — avoids stale or NaN stored values. */
export function resolveTotalBaseUnits(record: UnitConversionRecord): number | null {
  return computeTotalBaseUnits(record.firstMultiplier, record.secondMultiplier);
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

export function formatChainSummary(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): string {
  const chain = resolveConversionDisplay(record, unitNameById);
  const parts: string[] = [];

  if (chain.isThreeTier) {
    parts.push(
      `1 ${chain.baseUnitName} = ${chain.multiplier1} ${chain.intermediateUnit}`
    );
    parts.push(
      `1 ${chain.intermediateUnit} = ${chain.multiplier2} ${chain.finalUnit}`
    );
  } else if (chain.multiplier1 != null && chain.intermediateUnit) {
    parts.push(
      `1 ${chain.baseUnitName} = ${chain.multiplier1} ${chain.intermediateUnit}`
    );
  } else if (chain.multiplier1 != null && chain.finalUnit) {
    parts.push(
      `1 ${chain.baseUnitName} = ${chain.multiplier1} ${chain.finalUnit}`
    );
  } else if (chain.multiplier1 != null) {
    parts.push(`1 ${chain.baseUnitName} = ${chain.multiplier1}`);
  } else if (chain.intermediateUnit) {
    parts.push(`1 ${chain.baseUnitName} = 1 ${chain.intermediateUnit}`);
  } else {
    parts.push(`Main unit: ${chain.baseUnitName}`);
  }

  if (chain.total != null && chain.total > 0) {
    const targetUnit =
      chain.finalUnit ?? chain.intermediateUnit ?? chain.baseUnitName;
    parts.push(`Total = ${chain.total.toLocaleString("en-IN")} ${targetUnit}`);
  }

  return `${parts.join(", ")}.`;
}

export function formatChainShort(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): string {
  const chain = resolveConversionDisplay(record, unitNameById);
  const segments: string[] = [`1 ${chain.baseUnitName}`];

  if (chain.isThreeTier) {
    segments.push(`${chain.multiplier1} ${chain.intermediateUnit}`);
    segments.push(`${chain.multiplier2} ${chain.finalUnit}`);
    return segments.join(CHAIN_ARROW);
  }

  if (chain.multiplier1 != null && chain.intermediateUnit) {
    segments.push(`${chain.multiplier1} ${chain.intermediateUnit}`);
  } else if (chain.multiplier1 != null && chain.finalUnit) {
    segments.push(`${chain.multiplier1} ${chain.finalUnit}`);
  } else if (chain.multiplier1 != null) {
    segments.push(String(chain.multiplier1));
  } else if (chain.intermediateUnit) {
    segments.push(chain.intermediateUnit);
  }

  if (
    chain.multiplier2 != null &&
    chain.finalUnit &&
    !chain.isThreeTier &&
    !segments.some((segment) => segment.includes(chain.finalUnit!))
  ) {
    segments.push(`${chain.multiplier2} ${chain.finalUnit}`);
  } else if (
    chain.finalUnit &&
    chain.intermediateUnit &&
    !chain.isThreeTier &&
    !segments.some((segment) => segment.includes(chain.finalUnit!))
  ) {
    segments.push(chain.finalUnit);
  }

  return segments.join(CHAIN_ARROW);
}

export function formatTotalBaseUnits(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): string {
  const chain = resolveConversionDisplay(record, unitNameById);

  if (chain.total == null || chain.total <= 0 || !Number.isFinite(chain.total)) {
    return "—";
  }

  const unit = chain.finalUnit ?? chain.intermediateUnit ?? chain.baseUnitName;
  return `${chain.total.toLocaleString("en-IN")} ${unit}`;
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
