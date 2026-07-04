export type UnitConversionRecord = {
  id: string;
  /** Level 1 — Main Primary Unit (mandatory). */
  baseUnitId: string;
  baseUnitName: string;
  /** Multiplier from Level 1 → Level 2. */
  firstMultiplier: number | null;
  /** Level 2 — Secondary Unit. */
  intermediateUnitId: string | null;
  intermediateUnitName: string | null;
  /** Multiplier from Level 2 → Level 3. */
  secondMultiplier: number | null;
  /** Level 3 — Tertiary Unit. */
  tertiaryUnitId: string | null;
  tertiaryUnitName: string | null;
  /** Multiplier from Level 3 → Level 4. */
  thirdMultiplier: number | null;
  /** Level 4 — Fourth conversion unit. */
  fourthUnitId: string | null;
  fourthUnitName: string | null;
  /** @deprecated Migrated to tertiaryUnit on read; not written on new saves. */
  finalUnitId?: string | null;
  finalUnitName?: string | null;
  totalBaseUnits: number | null;
  createdAt: string;
  updatedAt: string;
};

export type UnitConversionFormState = Omit<
  UnitConversionRecord,
  "id" | "totalBaseUnits" | "createdAt" | "updatedAt" | "finalUnitId" | "finalUnitName"
>;

export const EMPTY_UNIT_CONVERSION_FORM: UnitConversionFormState = {
  baseUnitId: "",
  baseUnitName: "",
  firstMultiplier: null,
  intermediateUnitId: null,
  intermediateUnitName: null,
  secondMultiplier: null,
  tertiaryUnitId: null,
  tertiaryUnitName: null,
  thirdMultiplier: null,
  fourthUnitId: null,
  fourthUnitName: null,
};

type LegacyConversionRow = Partial<UnitConversionRecord> & {
  mainUnitId?: string;
  mainUnitName?: string;
  conversionFactor?: number;
  subUnitId?: string;
  subUnitName?: string;
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

export type ConversionChainStep = {
  multiplier: number | null;
  unit: string;
};

export type ConversionDisplayChain = {
  baseUnitName: string;
  steps: ConversionChainStep[];
  total: number | null;
  totalUnit: string | null;
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

export function computeTotalBaseUnits(
  firstMultiplier: number | null | undefined,
  secondMultiplier: number | null | undefined,
  thirdMultiplier?: number | null | undefined
): number | null {
  const multipliers = [firstMultiplier, secondMultiplier, thirdMultiplier].filter(
    (value): value is number => hasPositiveMultiplier(value)
  );

  if (multipliers.length === 0) return null;
  return multipliers.reduce((product, value) => product * value, 1);
}

export function resolveTotalBaseUnits(record: UnitConversionRecord): number | null {
  return computeTotalBaseUnits(
    record.firstMultiplier,
    record.secondMultiplier,
    record.thirdMultiplier
  );
}

/** Hydrate all 4 chain levels from stored state — never skip tiers when data exists. */
export function resolveConversionDisplay(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): ConversionDisplayChain {
  const baseUnitName = record.baseUnitName?.trim() || "—";

  const secondary = resolveUnitName(
    record.intermediateUnitId,
    record.intermediateUnitName,
    unitNameById
  );
  const tertiary = resolveUnitName(
    record.tertiaryUnitId,
    record.tertiaryUnitName,
    unitNameById
  );
  const fourth = resolveUnitName(
    record.fourthUnitId,
    record.fourthUnitName,
    unitNameById
  );

  const mult1 = hasPositiveMultiplier(record.firstMultiplier)
    ? record.firstMultiplier
    : null;
  const mult2 = hasPositiveMultiplier(record.secondMultiplier)
    ? record.secondMultiplier
    : null;
  const mult3 = hasPositiveMultiplier(record.thirdMultiplier)
    ? record.thirdMultiplier
    : null;

  const steps: ConversionChainStep[] = [];

  if (secondary) {
    steps.push({ multiplier: mult1, unit: secondary });
    if (tertiary) {
      steps.push({ multiplier: mult2, unit: tertiary });
      if (fourth) {
        steps.push({ multiplier: mult3, unit: fourth });
      }
    } else if (fourth) {
      steps.push({ multiplier: mult2 ?? mult3, unit: fourth });
    }
  } else if (tertiary) {
    steps.push({ multiplier: mult1, unit: tertiary });
    if (fourth) {
      steps.push({ multiplier: mult2 ?? mult3, unit: fourth });
    }
  } else if (fourth) {
    steps.push({ multiplier: mult1, unit: fourth });
  } else if (mult1 != null) {
    steps.push({ multiplier: mult1, unit: baseUnitName });
  }

  const total = computeTotalBaseUnits(mult1, mult2, mult3);
  const totalUnit = fourth ?? tertiary ?? secondary ?? baseUnitName;

  return { baseUnitName, steps, total, totalUnit };
}

export function normalizeUnitConversionRecord(
  row: LegacyConversionRow & Pick<UnitConversionRecord, "id">
): UnitConversionRecord {
  const hasNewShape = Boolean(
    row.baseUnitId || row.intermediateUnitId || row.tertiaryUnitId || row.fourthUnitId
  );

  if (!hasNewShape && row.mainUnitId) {
    const firstMultiplier = toOptionalNumber(row.conversionFactor);
    const secondaryId = toOptionalString(row.subUnitId);
    const secondaryName = toOptionalString(row.subUnitName);
    return {
      id: row.id,
      baseUnitId: row.mainUnitId,
      baseUnitName: row.mainUnitName ?? "",
      firstMultiplier,
      intermediateUnitId: secondaryId,
      intermediateUnitName: secondaryName,
      secondMultiplier: null,
      tertiaryUnitId: secondaryId,
      tertiaryUnitName: secondaryName,
      thirdMultiplier: null,
      fourthUnitId: null,
      fourthUnitName: null,
      totalBaseUnits: computeTotalBaseUnits(firstMultiplier, null),
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    };
  }

  const firstMultiplier = toOptionalNumber(row.firstMultiplier);
  const secondMultiplier = toOptionalNumber(row.secondMultiplier);
  const thirdMultiplier = toOptionalNumber(row.thirdMultiplier);
  const intermediateUnitId = toOptionalString(row.intermediateUnitId);
  const intermediateUnitName = toOptionalString(row.intermediateUnitName);

  let tertiaryUnitId = toOptionalString(row.tertiaryUnitId);
  let tertiaryUnitName = toOptionalString(row.tertiaryUnitName);
  let fourthUnitId = toOptionalString(row.fourthUnitId);
  let fourthUnitName = toOptionalString(row.fourthUnitName);

  const legacyFinalId = toOptionalString(row.finalUnitId);
  const legacyFinalName = toOptionalString(row.finalUnitName);

  if (!fourthUnitId && legacyFinalId) {
    if (tertiaryUnitId && tertiaryUnitId !== legacyFinalId) {
      fourthUnitId = legacyFinalId;
      fourthUnitName = legacyFinalName;
    } else if (!tertiaryUnitId) {
      tertiaryUnitId = legacyFinalId;
      tertiaryUnitName = legacyFinalName;
    }
  }

  return {
    id: row.id,
    baseUnitId: row.baseUnitId ?? "",
    baseUnitName: row.baseUnitName ?? "",
    firstMultiplier,
    intermediateUnitId,
    intermediateUnitName,
    secondMultiplier,
    tertiaryUnitId,
    tertiaryUnitName,
    thirdMultiplier,
    fourthUnitId,
    fourthUnitName,
    totalBaseUnits: computeTotalBaseUnits(firstMultiplier, secondMultiplier, thirdMultiplier),
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
    form.tertiaryUnitId,
    form.fourthUnitId,
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

  if (form.thirdMultiplier !== null && form.thirdMultiplier <= 0) {
    return "Multiplier 3 must be greater than zero when provided.";
  }

  return null;
}

export function formatChainSummary(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): string {
  const chain = resolveConversionDisplay(record, unitNameById);
  const parts: string[] = [];

  if (chain.steps.length === 0) {
    parts.push(`Main unit: ${chain.baseUnitName}`);
  } else {
    let previousUnit = chain.baseUnitName;
    for (const step of chain.steps) {
      if (step.multiplier != null) {
        parts.push(`1 ${previousUnit} = ${step.multiplier} ${step.unit}`);
      } else {
        parts.push(`1 ${previousUnit} = 1 ${step.unit}`);
      }
      previousUnit = step.unit;
    }
  }

  if (chain.total != null && chain.total > 0 && chain.totalUnit) {
    parts.push(`Total = ${chain.total.toLocaleString("en-IN")} ${chain.totalUnit}`);
  }

  return `${parts.join(", ")}.`;
}

export function formatChainShort(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): string {
  const chain = resolveConversionDisplay(record, unitNameById);
  const segments: string[] = [`1 ${chain.baseUnitName}`];

  for (const step of chain.steps) {
    if (step.multiplier != null) {
      segments.push(`${step.multiplier} ${step.unit}`);
    } else {
      segments.push(step.unit);
    }
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

  return `${chain.total.toLocaleString("en-IN")} ${chain.totalUnit ?? chain.baseUnitName}`;
}

export function buildConversionPayload(
  form: UnitConversionFormState
): Omit<UnitConversionRecord, "id" | "createdAt" | "updatedAt" | "finalUnitId" | "finalUnitName"> {
  return {
    baseUnitId: form.baseUnitId,
    baseUnitName: form.baseUnitName,
    firstMultiplier: form.firstMultiplier,
    intermediateUnitId: form.intermediateUnitId,
    intermediateUnitName: form.intermediateUnitName,
    secondMultiplier: form.secondMultiplier,
    tertiaryUnitId: form.tertiaryUnitId,
    tertiaryUnitName: form.tertiaryUnitName,
    thirdMultiplier: form.thirdMultiplier,
    fourthUnitId: form.fourthUnitId,
    fourthUnitName: form.fourthUnitName,
    totalBaseUnits: computeTotalBaseUnits(
      form.firstMultiplier,
      form.secondMultiplier,
      form.thirdMultiplier
    ),
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
    tertiaryUnitId: record.tertiaryUnitId,
    tertiaryUnitName: record.tertiaryUnitName,
    thirdMultiplier: record.thirdMultiplier,
    fourthUnitId: record.fourthUnitId,
    fourthUnitName: record.fourthUnitName,
  };
}
