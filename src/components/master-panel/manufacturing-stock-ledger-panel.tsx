"use client";

import { useMemo } from "react";
import { Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItems } from "@/hooks/use-items";
import {
  buildStockLedgerRow,
  STOCK_ALERT_BADGE_CLASS,
  type StockLedgerRow,
} from "@/lib/stock-level-alert";
import { matchesEntityFilter } from "@/constants/display-criteria-config";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type ManufacturingStockLedgerPanelProps = {
  entityFilter?: string;
  reportSubType?: string;
};

function StockLevelAlertBadge({ row }: { row: StockLedgerRow }) {
  if (!row.alert) {
    return <span className="text-xs text-corporate-muted">Within limits</span>;
  }

  return (
    <span className={STOCK_ALERT_BADGE_CLASS[row.alert.kind]}>{row.alert.label}</span>
  );
}

export default function ManufacturingStockLedgerPanel({
  entityFilter = "",
  reportSubType = "Summary View",
}: ManufacturingStockLedgerPanelProps) {
  const { items, isReady } = useItems();

  const ledgerRows = useMemo(() => {
    if (!isReady) return [];

    return items
      .map((item) => buildStockLedgerRow(item))
      .filter((row) =>
        matchesEntityFilter(
          `${row.itemName} ${row.category} ${row.unit}`,
          entityFilter
        )
      )
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [entityFilter, isReady, items]);

  return (
    <article
      className="rounded-xl border-2 border-corporate-brand/30 bg-corporate-surface shadow-card"
      aria-label="Manufacturing and stock ledger"
    >
      <header className="flex flex-col gap-2 border-b border-corporate-border bg-corporate-brand-light/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 shrink-0 text-corporate-brand" aria-hidden />
          <div>
            <h3 className="text-sm font-bold text-corporate-text">
              Manufacturing &amp; Stock Ledger
            </h3>
            <p className="text-xs text-corporate-muted">
              Finished goods, raw materials, machinery components, and parts — unified closing
              balance with min / max / reorder alerts
            </p>
          </div>
        </div>
        <p className="text-xs text-corporate-muted">
          Mode: <span className="font-semibold text-corporate-text">{reportSubType}</span>
        </p>
      </header>

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
        <table className={MASTER_LIST_TABLE_CLASS}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item / SKU</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Category / Group</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Closing Balance</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Min</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Max</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Reorder</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Stock Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {!isReady ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-corporate-muted">
                  Loading stock ledger…
                </td>
              </tr>
            ) : ledgerRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-corporate-muted">
                  No inventory items match the current filter. Add items in Items Master with stock
                  level parameters to populate this ledger.
                </td>
              </tr>
            ) : (
              ledgerRows.map((row) => (
                <tr key={row.itemId} className="hover:bg-corporate-bg/50">
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>
                    {row.itemName}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.category}</td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-bold")}>
                    {row.closingBalance.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-normal text-corporate-muted">{row.unit}</span>
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                    {row.minimumStockLevel.toLocaleString("en-IN")}
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                    {row.maximumStockLevel.toLocaleString("en-IN")}
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                    {row.reorderLevel.toLocaleString("en-IN")}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <StockLevelAlertBadge row={row} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
