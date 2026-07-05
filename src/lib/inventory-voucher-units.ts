import type { ItemRecord } from "@/types/item";
import type { UnitConversionRecord } from "@/types/unit-conversion";
import { bindConversionToItem, buildAlternateFormulaOptions } from "@/lib/item-unit-conversion";

export function buildUnitOptionsForItem(
  item: ItemRecord | undefined,
  conversions: UnitConversionRecord[],
  unitNameById: Record<string, string>
): { value: string; label: string; conversionId: string }[] {
  if (!item) return [];

  const options: { value: string; label: string; conversionId: string }[] = [];

  if (item.primaryUnitName) {
    options.push({
      value: `primary:${item.primaryUnitId}`,
      label: item.primaryUnitName,
      conversionId: "",
    });
  }

  for (const option of buildAlternateFormulaOptions(
    conversions,
    item.primaryUnitId,
    unitNameById
  )) {
    options.push({
      value: `conv:${option.value}`,
      label: option.label,
      conversionId: option.value,
    });
  }

  return options;
}

export function resolveUnitSelection(
  unitSelection: string,
  options: ReturnType<typeof buildUnitOptionsForItem>
): { unitLabel: string; unitConversionId: string } {
  const match = options.find((row) => row.value === unitSelection);
  return {
    unitLabel: match?.label ?? "",
    unitConversionId: match?.conversionId ?? "",
  };
}

export function applyConversionBindingToItem(
  item: ItemRecord,
  conversionId: string,
  conversions: UnitConversionRecord[],
  unitNameById: Record<string, string>
): ItemRecord {
  if (!conversionId) return item;
  const conversion = conversions.find((row) => row.id === conversionId);
  if (!conversion) return item;
  return { ...item, ...bindConversionToItem(conversion, unitNameById) };
}

export function isItemLineFilled(line: { itemId: string; quantity: number }): boolean {
  return Boolean(line.itemId) && line.quantity > 0;
}

export function ensureTrailingItemLine<T extends { itemId: string; quantity: number }>(
  lines: T[],
  createEmpty: () => T
): T[] {
  if (lines.length === 0) return [createEmpty()];
  const last = lines[lines.length - 1];
  if (isItemLineFilled(last)) return [...lines, createEmpty()];
  return lines;
}

export function defaultRateForVoucherKind(
  item: ItemRecord,
  kind: "sales" | "purchase" | "sales-return" | "purchase-return"
): number {
  if (kind === "sales" || kind === "sales-return") {
    return item.salesRateMrp || item.purchaseRate || 0;
  }
  return item.purchaseRate || item.salesRateMrp || 0;
}
