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

function hasUnitName(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

const CHAIN_ARROW = " ➔ ";

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

export function formatChainSummary(record: UnitConversionRecord): string {
  const parts: string[] = [];
  const total = resolveTotalBaseUnits(record);
  const hasIntermediate = hasUnitName(record.intermediateUnitName);
  const hasFinal = hasUnitName(record.finalUnitName);
  const hasMult1 = hasPositiveMultiplier(record.firstMultiplier);
  const hasMult2 = hasPositiveMultiplier(record.secondMultiplier);

  if (hasMult1 && hasIntermediate) {
    parts.push(
      `1 ${record.baseUnitName} = ${record.firstMultiplier} ${record.intermediateUnitName}`
    );
  } else if (hasMult1 && hasFinal) {
    parts.push(
      `1 ${record.baseUnitName} = ${record.firstMultiplier} ${record.finalUnitName}`
    );
  } else if (hasMult1) {
    parts.push(`1 ${record.baseUnitName} = ${record.firstMultiplier}`);
  } else if (hasIntermediate) {
    parts.push(`1 ${record.baseUnitName} = 1 ${record.intermediateUnitName}`);
  } else {
    parts.push(`Main unit: ${record.baseUnitName}`);
  }

  if (hasMult2 && hasIntermediate && hasFinal) {
    parts.push(
      `1 ${record.intermediateUnitName} = ${record.secondMultiplier} ${record.finalUnitName}`
    );
  } else if (hasMult2 && hasFinal && !hasIntermediate) {
    parts.push(`Multiplier 2 = ${record.secondMultiplier} ${record.finalUnitName}`);
  }

  if (total != null && total > 0) {
    const targetUnit = hasFinal
      ? record.finalUnitName!
      : hasIntermediate
        ? record.intermediateUnitName!
        : record.baseUnitName;
    parts.push(`Total = ${total.toLocaleString("en-IN")} ${targetUnit}`);
  }

  return `${parts.join(", ")}.`;
}

export function formatChainShort(record: UnitConversionRecord): string {
  const segments: string[] = [`1 ${record.baseUnitName}`];
  const hasIntermediate = hasUnitName(record.intermediateUnitName);
  const hasFinal = hasUnitName(record.finalUnitName);
  const hasMult1 = hasPositiveMultiplier(record.firstMultiplier);
  const hasMult2 = hasPositiveMultiplier(record.secondMultiplier);

  // Level 1: base → intermediate (or direct to final when no intermediate)
  if (hasMult1 && hasIntermediate) {
    segments.push(`${record.firstMultiplier} ${record.intermediateUnitName}`);
  } else if (hasIntermediate) {
    segments.push(record.intermediateUnitName!);
  } else if (hasMult1 && hasFinal) {
    segments.push(`${record.firstMultiplier} ${record.finalUnitName}`);
  } else if (hasMult1) {
    segments.push(String(record.firstMultiplier));
  }

  // Level 2: intermediate → final — always show when intermediate exists in the chain
  if (hasMult2 && hasFinal && hasIntermediate) {
    segments.push(`${record.secondMultiplier} ${record.finalUnitName}`);
  } else if (hasMult2 && hasFinal && !hasIntermediate) {
    const lastSegment = segments[segments.length - 1] ?? "";
    const nextSegment = `${record.secondMultiplier} ${record.finalUnitName}`;
    if (lastSegment !== nextSegment) {
      segments.push(nextSegment);
    }
  } else if (hasFinal && hasIntermediate) {
    const lastSegment = segments[segments.length - 1] ?? "";
    if (!lastSegment.includes(record.finalUnitName!)) {
      segments.push(record.finalUnitName!);
    }
  }

  return segments.join(CHAIN_ARROW);
}

export function formatTotalBaseUnits(record: UnitConversionRecord): string {
  const total = resolveTotalBaseUnits(record);

  if (total == null || total <= 0 || !Number.isFinite(total)) {
    return "—";
  }

  const unit = hasUnitName(record.finalUnitName)
    ? record.finalUnitName
    : hasUnitName(record.intermediateUnitName)
      ? record.intermediateUnitName
      : record.baseUnitName;

  return `${total.toLocaleString("en-IN")} ${unit}`;
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
