"use client";

import { useMemo } from "react";
import { Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesEntityFilter } from "@/constants/display-criteria-config";
import { isWithinDateRange } from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

type ProductionBalanceRow = {
  date: string;
  itemName: string;
  openingStock: number;
  received: number;
  consumed: number;
  manufacturingDay: number;
  manufacturingNight: number;
  sales: number;
  transfer: number;
};

const PRODUCTION_BALANCE_ROWS: ProductionBalanceRow[] = [
  {
    date: "2026-07-05",
    itemName: "Finished Casting Lot #A-18",
    openingStock: 320,
    received: 0,
    consumed: 48,
    manufacturingDay: 96,
    manufacturingNight: 46,
    sales: 142,
    transfer: 12,
  },
  {
    date: "2026-07-05",
    itemName: "Machined Gear Assembly",
    openingStock: 84,
    received: 36,
    consumed: 18,
    manufacturingDay: 22,
    manufacturingNight: 14,
    sales: 36,
    transfer: 8,
  },
  {
    date: "2026-07-05",
    itemName: "Hydraulic Pump Assembly",
    openingStock: 52,
    received: 0,
    consumed: 12,
    manufacturingDay: 16,
    manufacturingNight: 12,
    sales: 28,
    transfer: 0,
  },
  {
    date: "2026-07-05",
    itemName: "MS Round Bar 12mm (WIP)",
    openingStock: 1240,
    received: 2400,
    consumed: 860,
    manufacturingDay: 0,
    manufacturingNight: 0,
    sales: 0,
    transfer: 320,
  },
  {
    date: "2026-07-04",
    itemName: "Foundry Sand Cast Block",
    openingStock: 410,
    received: 0,
    consumed: 62,
    manufacturingDay: 112,
    manufacturingNight: 76,
    sales: 188,
    transfer: 24,
  },
  {
    date: "2026-07-04",
    itemName: "Corrugated Carton Boxes",
    openingStock: 2800,
    received: 500,
    consumed: 0,
    manufacturingDay: 0,
    manufacturingNight: 0,
    sales: 420,
    transfer: 180,
  },
];

function computeClosingBalance(row: ProductionBalanceRow): number {
  return (
    row.openingStock +
    row.received +
    row.manufacturingDay +
    row.manufacturingNight -
    row.consumed -
    row.sales -
    row.transfer
  );
}

function formatQty(value: number): string {
  return value.toLocaleString("en-IN");
}

const INPUT_HEAD_CLASS =
  "border-b border-emerald-200 bg-emerald-50/90 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-emerald-900";
const INPUT_CELL_CLASS = "bg-emerald-50/40";

const PROCESS_HEAD_CLASS =
  "border-b border-amber-200 bg-amber-50/90 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-amber-900";
const PROCESS_CELL_CLASS = "bg-amber-50/35";

const OUTWARD_HEAD_CLASS =
  "border-b border-red-200 bg-red-50/90 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-red-900";
const OUTWARD_CELL_CLASS = "bg-red-50/35";

const CLOSING_HEAD_CLASS =
  "border-b border-corporate-brand/30 bg-corporate-brand-light px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-corporate-brand";
const CLOSING_CELL_CLASS = "bg-corporate-brand-light/50 font-bold text-corporate-brand";

type DailyProductionSummaryPanelProps = {
  fromDate: string;
  toDate: string;
  entityFilter?: string;
};

export default function DailyProductionSummaryPanel({
  fromDate,
  toDate,
  entityFilter = "",
}: DailyProductionSummaryPanelProps) {
  const filteredRows = useMemo(
    () =>
      PRODUCTION_BALANCE_ROWS.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(`${row.itemName} ${row.date}`, entityFilter)
      ),
    [entityFilter, fromDate, toDate]
  );

  const totals = useMemo(() => {
    const sum = {
      openingStock: 0,
      received: 0,
      consumed: 0,
      manufacturingDay: 0,
      manufacturingNight: 0,
      sales: 0,
      transfer: 0,
      closingBalance: 0,
    };
    for (const row of filteredRows) {
      sum.openingStock += row.openingStock;
      sum.received += row.received;
      sum.consumed += row.consumed;
      sum.manufacturingDay += row.manufacturingDay;
      sum.manufacturingNight += row.manufacturingNight;
      sum.sales += row.sales;
      sum.transfer += row.transfer;
      sum.closingBalance += computeClosingBalance(row);
    }
    return sum;
  }, [filteredRows]);

  return (
    <div className="w-full space-y-4" aria-label="Daily production input-output balance chart">
      <div className="flex flex-col gap-3 border-b border-corporate-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-corporate-text">
              Daily Production Summary — Input / Output Balance Chart
            </h3>
            <p className="text-xs text-corporate-muted">
              Full-width stock movement across opening, processing, and outward flows
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
            Input
          </span>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
            Processing
          </span>
          <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800">
            Outward
          </span>
          <span className="rounded border border-corporate-brand/30 bg-corporate-brand-light px-2 py-1 text-corporate-brand">
            Closing
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[1100px] w-full")}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
              <th className={cn(MASTER_LIST_HEADER_CELL_CLASS, "min-w-[180px]")}>Item Name</th>
              <th className={cn(INPUT_HEAD_CLASS, "text-right")}>Opening Stock</th>
              <th className={cn(INPUT_HEAD_CLASS, "text-right")}>Received</th>
              <th className={cn(PROCESS_HEAD_CLASS, "text-right")}>Consumed</th>
              <th className={cn(PROCESS_HEAD_CLASS, "text-right")}>Manufacturing Day</th>
              <th className={cn(PROCESS_HEAD_CLASS, "text-right")}>Manufacturing Night</th>
              <th className={cn(OUTWARD_HEAD_CLASS, "text-right")}>Sales</th>
              <th className={cn(OUTWARD_HEAD_CLASS, "text-right")}>Transfer</th>
              <th className={CLOSING_HEAD_CLASS}>Closing Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  No production balance rows match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const closingBalance = computeClosingBalance(row);
                return (
                  <tr
                    key={`${row.date}-${row.itemName}`}
                    className="hover:bg-corporate-bg/40"
                  >
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                      {row.date}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "min-w-[180px] font-medium")}>
                      {row.itemName}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        INPUT_CELL_CLASS,
                        "text-right font-medium"
                      )}
                    >
                      {formatQty(row.openingStock)}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        INPUT_CELL_CLASS,
                        "text-right font-medium text-emerald-700"
                      )}
                    >
                      {formatQty(row.received)}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        PROCESS_CELL_CLASS,
                        "text-right font-medium text-amber-800"
                      )}
                    >
                      {formatQty(row.consumed)}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        PROCESS_CELL_CLASS,
                        "text-right font-medium"
                      )}
                    >
                      {formatQty(row.manufacturingDay)}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        PROCESS_CELL_CLASS,
                        "text-right font-medium"
                      )}
                    >
                      {formatQty(row.manufacturingNight)}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        OUTWARD_CELL_CLASS,
                        "text-right font-semibold text-red-700"
                      )}
                    >
                      {formatQty(row.sales)}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        OUTWARD_CELL_CLASS,
                        "text-right font-medium text-red-700"
                      )}
                    >
                      {formatQty(row.transfer)}
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        CLOSING_CELL_CLASS,
                        MASTER_LIST_HEADER_CELL_RIGHT_CLASS
                      )}
                    >
                      {formatQty(closingBalance)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot className="border-t-2 border-corporate-border bg-corporate-bg">
              <tr>
                <td
                  colSpan={2}
                  className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-corporate-text")}
                >
                  Totals ({filteredRows.length} items)
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    INPUT_CELL_CLASS,
                    "text-right font-bold"
                  )}
                >
                  {formatQty(totals.openingStock)}
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    INPUT_CELL_CLASS,
                    "text-right font-bold text-emerald-700"
                  )}
                >
                  {formatQty(totals.received)}
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    PROCESS_CELL_CLASS,
                    "text-right font-bold text-amber-800"
                  )}
                >
                  {formatQty(totals.consumed)}
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    PROCESS_CELL_CLASS,
                    "text-right font-bold"
                  )}
                >
                  {formatQty(totals.manufacturingDay)}
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    PROCESS_CELL_CLASS,
                    "text-right font-bold"
                  )}
                >
                  {formatQty(totals.manufacturingNight)}
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    OUTWARD_CELL_CLASS,
                    "text-right font-bold text-red-700"
                  )}
                >
                  {formatQty(totals.sales)}
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    OUTWARD_CELL_CLASS,
                    "text-right font-bold text-red-700"
                  )}
                >
                  {formatQty(totals.transfer)}
                </td>
                <td
                  className={cn(
                    MASTER_LIST_BODY_CELL_CLASS,
                    CLOSING_CELL_CLASS,
                    "text-right text-base"
                  )}
                >
                  {formatQty(totals.closingBalance)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
