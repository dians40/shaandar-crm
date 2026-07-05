import type { ItemRecord } from "@/types/item";
import { getItemClosingBalance } from "@/lib/inventory-stock-ledger";

export type StockLevelAlertKind = "critical" | "excess" | "reorder";

export type StockLevelAlert = {
  kind: StockLevelAlertKind;
  label: string;
};

export type StockLedgerRow = {
  itemId: string;
  itemName: string;
  category: string;
  closingBalance: number;
  unit: string;
  minimumStockLevel: number;
  maximumStockLevel: number;
  reorderLevel: number;
  alert: StockLevelAlert | null;
};

export function resolveStockLevelAlert(
  closingBalance: number,
  minimumStockLevel: number,
  maximumStockLevel: number,
  reorderLevel: number
): StockLevelAlert | null {
  if (minimumStockLevel > 0 && closingBalance < minimumStockLevel) {
    return { kind: "critical", label: "🔴 CRITICAL SHORTAGE" };
  }

  if (maximumStockLevel > 0 && closingBalance > maximumStockLevel) {
    return { kind: "excess", label: "⚠️ EXCESS OVER-STOCK" };
  }

  if (
    reorderLevel > 0 &&
    closingBalance <= reorderLevel &&
    closingBalance > minimumStockLevel
  ) {
    return { kind: "reorder", label: "🔵 REORDER REQUIRED" };
  }

  return null;
}

export function buildStockLedgerRow(item: ItemRecord): StockLedgerRow {
  const closingBalance = getItemClosingBalance(item);

  return {
    itemId: item.id,
    itemName: item.itemName,
    category: item.itemGroupName || "Uncategorized",
    closingBalance,
    unit: item.primaryUnitName || "—",
    minimumStockLevel: item.minimumStockLevel,
    maximumStockLevel: item.maximumStockLevel,
    reorderLevel: item.reorderLevel,
    alert: resolveStockLevelAlert(
      closingBalance,
      item.minimumStockLevel,
      item.maximumStockLevel,
      item.reorderLevel
    ),
  };
}

export const STOCK_ALERT_BADGE_CLASS: Record<StockLevelAlertKind, string> = {
  critical: "rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700",
  excess:
    "rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800",
  reorder:
    "rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800",
};
