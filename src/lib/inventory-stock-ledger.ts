import type { InventoryVoucherKind, TransactionItemLine } from "@/types/inventory-voucher";
import type { ItemRecord } from "@/types/item";
import { resolveTotalBaseUnits, type UnitConversionRecord } from "@/types/unit-conversion";
import { computePrimaryStockFromBulk } from "@/lib/item-unit-conversion";

const STORAGE_KEY = "shaandar-crm-inventory-stock-balances";

export type StockBalances = Record<string, number>;

function readBalances(): StockBalances {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StockBalances;
  } catch {
    return {};
  }
}

function writeBalances(balances: StockBalances) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
}

function linePrimaryQuantity(
  line: TransactionItemLine,
  item?: ItemRecord,
  conversions: UnitConversionRecord[] = []
): number {
  if (!item) return line.quantity;

  if (line.unitConversionId) {
    const conversion = conversions.find((row) => row.id === line.unitConversionId);
    if (conversion) {
      const factor = resolveTotalBaseUnits(conversion);
      return factor != null && factor > 0 ? line.quantity * factor : line.quantity;
    }
  }

  if (line.unitSelection.startsWith("conv:")) {
    return computePrimaryStockFromBulk(line.quantity, item);
  }

  return line.quantity;
}

function stockMultiplier(kind: InventoryVoucherKind): number {
  switch (kind) {
    case "sales":
    case "purchase-return":
      return -1;
    default:
      return 1;
  }
}

export function applyInventoryVoucherToStock(
  kind: InventoryVoucherKind,
  lines: TransactionItemLine[],
  itemMap: Record<string, ItemRecord>,
  conversions: UnitConversionRecord[] = []
): StockBalances {
  const balances = readBalances();
  const sign = stockMultiplier(kind);

  for (const line of lines) {
    if (!line.itemId || line.quantity <= 0) continue;
    const item = itemMap[line.itemId];
    const primaryQty = linePrimaryQuantity(line, item, conversions) * sign;
    balances[line.itemId] = round2((balances[line.itemId] ?? 0) + primaryQty);
  }

  writeBalances(balances);
  return balances;
}

export function applyManufacturingStock(
  rawLines: Array<{ itemId: string; quantity: number }>,
  outputItemId: string,
  outputQuantity: number
): StockBalances {
  const balances = readBalances();

  for (const line of rawLines) {
    if (!line.itemId || line.quantity <= 0) continue;
    balances[line.itemId] = round2((balances[line.itemId] ?? 0) - line.quantity);
  }

  if (outputItemId && outputQuantity > 0) {
    balances[outputItemId] = round2((balances[outputItemId] ?? 0) + outputQuantity);
  }

  writeBalances(balances);
  return balances;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getStockBalances(): StockBalances {
  return readBalances();
}

export function getItemClosingBalance(item: ItemRecord, balances?: StockBalances): number {
  const ledger = balances ?? readBalances();
  const movement = ledger[item.id] ?? 0;
  return round2(item.openingStockQuantity + movement);
}
