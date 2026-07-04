import type { ItemRecord } from "@/types/item";
import {
  computeTotalBaseUnits,
  formatChainProductFormula,
  formatChainSummary,
  formatTotalBaseUnits,
  resolveConversionDisplay,
  resolveTotalBaseUnits,
  type UnitConversionRecord,
} from "@/types/unit-conversion";

const FORMULA_SEPARATOR = " × ";

function collectConversionUnitIds(record: UnitConversionRecord): string[] {
  return [
    record.baseUnitId,
    record.intermediateUnitId,
    record.tertiaryUnitId,
    record.fourthUnitId,
  ].filter((id): id is string => Boolean(id?.trim()));
}

/** Returns true when a conversion chain includes the item's primary selling unit. */
export function conversionMatchesItemUnits(
  conversion: UnitConversionRecord,
  primaryUnitId: string,
  alternateUnitId?: string | null
): boolean {
  if (!primaryUnitId?.trim()) return false;

  const chainUnitIds = collectConversionUnitIds(conversion);
  if (!chainUnitIds.includes(primaryUnitId)) return false;

  if (alternateUnitId?.trim()) {
    return chainUnitIds.includes(alternateUnitId);
  }

  return true;
}

export function filterConversionsForItem(
  conversions: UnitConversionRecord[],
  primaryUnitId: string,
  alternateUnitId?: string | null
): UnitConversionRecord[] {
  if (!primaryUnitId?.trim()) return [];

  return conversions.filter((conversion) =>
    conversionMatchesItemUnits(conversion, primaryUnitId, alternateUnitId)
  );
}

/** Dropdown label without leading quantity — e.g. Carton × 120 Packets × 70 Pieces */
export function formatChainAlternateOptionLabel(
  record: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): string {
  const chain = resolveConversionDisplay(record, unitNameById);
  const segments = [chain.baseUnitName];

  for (const step of chain.steps) {
    if (step.multiplier != null) {
      segments.push(`${step.multiplier} ${step.unit}`);
    } else {
      segments.push(step.unit);
    }
  }

  return segments.join(FORMULA_SEPARATOR);
}

export function buildAlternateFormulaOptions(
  conversions: UnitConversionRecord[],
  primaryUnitId: string,
  unitNameById: Record<string, string>
): { value: string; label: string }[] {
  return filterConversionsForItem(conversions, primaryUnitId).map((conversion) => ({
    value: conversion.id,
    label: formatChainAlternateOptionLabel(conversion, unitNameById),
  }));
}

/** @deprecated Use buildAlternateFormulaOptions */
export function buildConversionSelectOptions(
  conversions: UnitConversionRecord[],
  unitNameById: Record<string, string>
): { value: string; label: string }[] {
  return conversions.map((conversion) => ({
    value: conversion.id,
    label: formatChainProductFormula(conversion, unitNameById),
  }));
}

export type ItemConversionBinding = Pick<
  ItemRecord,
  | "unitConversionId"
  | "alternateUnitId"
  | "alternateUnitName"
  | "conversionFirstMultiplier"
  | "conversionSecondMultiplier"
  | "conversionThirdMultiplier"
  | "conversionTotalBaseUnits"
>;

export function clearConversionBinding(): ItemConversionBinding {
  return {
    unitConversionId: "",
    alternateUnitId: "",
    alternateUnitName: "",
    conversionFirstMultiplier: null,
    conversionSecondMultiplier: null,
    conversionThirdMultiplier: null,
    conversionTotalBaseUnits: null,
  };
}

export function bindConversionToItem(
  conversion: UnitConversionRecord,
  unitNameById: Record<string, string> = {}
): ItemConversionBinding {
  return {
    unitConversionId: conversion.id,
    alternateUnitId: conversion.baseUnitId,
    alternateUnitName: formatChainAlternateOptionLabel(conversion, unitNameById),
    conversionFirstMultiplier: conversion.firstMultiplier,
    conversionSecondMultiplier: conversion.secondMultiplier,
    conversionThirdMultiplier: conversion.thirdMultiplier,
    conversionTotalBaseUnits: resolveTotalBaseUnits(conversion),
  };
}

export function resolveItemConversionPreview(
  conversion: UnitConversionRecord | null | undefined,
  unitNameById: Record<string, string> = {}
): {
  formula: string | null;
  summary: string | null;
  total: string | null;
} {
  if (!conversion) {
    return { formula: null, summary: null, total: null };
  }

  return {
    formula: formatChainProductFormula(conversion, unitNameById),
    summary: formatChainSummary(conversion, unitNameById),
    total: formatTotalBaseUnits(conversion, unitNameById),
  };
}

export function resolveItemConversionFactor(
  item: Pick<
    ItemRecord,
    | "conversionFirstMultiplier"
    | "conversionSecondMultiplier"
    | "conversionThirdMultiplier"
    | "conversionTotalBaseUnits"
  >
): number | null {
  if (
    item.conversionTotalBaseUnits != null &&
    item.conversionTotalBaseUnits > 0 &&
    Number.isFinite(item.conversionTotalBaseUnits)
  ) {
    return item.conversionTotalBaseUnits;
  }

  return computeTotalBaseUnits(
    item.conversionFirstMultiplier,
    item.conversionSecondMultiplier,
    item.conversionThirdMultiplier
  );
}

/** Convert bulk packaging quantity into primary (selling) units using linked formula. */
export function computePrimaryStockFromBulk(
  bulkQuantity: number,
  item: Pick<
    ItemRecord,
    | "conversionFirstMultiplier"
    | "conversionSecondMultiplier"
    | "conversionThirdMultiplier"
    | "conversionTotalBaseUnits"
  >
): number {
  if (!Number.isFinite(bulkQuantity) || bulkQuantity <= 0) return 0;

  const factor = resolveItemConversionFactor(item);
  if (factor == null || factor <= 0) return bulkQuantity;

  return bulkQuantity * factor;
}

/** Convert primary (selling) units into bulk packaging quantity. */
export function computeBulkStockFromPrimary(
  primaryQuantity: number,
  item: Pick<
    ItemRecord,
    | "conversionFirstMultiplier"
    | "conversionSecondMultiplier"
    | "conversionThirdMultiplier"
    | "conversionTotalBaseUnits"
  >
): number {
  if (!Number.isFinite(primaryQuantity) || primaryQuantity <= 0) return 0;

  const factor = resolveItemConversionFactor(item);
  if (factor == null || factor <= 0) return primaryQuantity;

  return primaryQuantity / factor;
}

export function resolveItemConversionRecord(
  item: Pick<ItemRecord, "unitConversionId">,
  conversions: UnitConversionRecord[]
): UnitConversionRecord | null {
  if (!item.unitConversionId?.trim()) return null;
  return conversions.find((row) => row.id === item.unitConversionId) ?? null;
}

/** Re-sync multiplier snapshot from Unit Conversion Master when loading legacy items. */
export function hydrateItemConversionBinding(
  item: ItemRecord,
  conversions: UnitConversionRecord[],
  unitNameById: Record<string, string> = {}
): ItemRecord {
  const conversion = resolveItemConversionRecord(item, conversions);
  if (!conversion) return item;

  if (
    item.conversionTotalBaseUnits != null &&
    item.conversionFirstMultiplier != null
  ) {
    return item;
  }

  return {
    ...item,
    ...bindConversionToItem(conversion, unitNameById),
  };
}
