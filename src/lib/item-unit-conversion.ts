import {
  formatChainProductFormula,
  formatChainSummary,
  formatTotalBaseUnits,
  type UnitConversionRecord,
} from "@/types/unit-conversion";

function collectConversionUnitIds(record: UnitConversionRecord): string[] {
  return [
    record.baseUnitId,
    record.intermediateUnitId,
    record.tertiaryUnitId,
    record.fourthUnitId,
  ].filter((id): id is string => Boolean(id?.trim()));
}

/** Returns true when a conversion chain includes both selected item units. */
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

export function buildConversionSelectOptions(
  conversions: UnitConversionRecord[],
  unitNameById: Record<string, string>
): { value: string; label: string }[] {
  return conversions.map((conversion) => ({
    value: conversion.id,
    label: formatChainProductFormula(conversion, unitNameById),
  }));
}

export function resolveItemConversionPreview(
  conversion: UnitConversionRecord | null | undefined,
  unitNameById: Record<string, string>
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
