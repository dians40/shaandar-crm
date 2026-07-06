"use client";

import { cn } from "@/lib/utils";
import { matchesEntityFilter } from "@/constants/display-criteria-config";
import { isWithinDateRange } from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

const PRODUCTION_ROWS = [
  {
    date: "2026-07-05",
    shift: "Morning",
    line: "Casting Line A",
    outputItem: "Finished Casting Lot #A-18",
    plannedQty: 150,
    actualQty: 142,
    efficiency: "94.7%",
    status: "On Target",
  },
  {
    date: "2026-07-05",
    shift: "Morning",
    line: "Machining Bay 2",
    outputItem: "Machined Gear Assembly",
    plannedQty: 40,
    actualQty: 36,
    efficiency: "90.0%",
    status: "Minor Shortfall",
  },
  {
    date: "2026-07-05",
    shift: "Evening",
    line: "Assembly Unit 1",
    outputItem: "Hydraulic Pump Assembly",
    plannedQty: 28,
    actualQty: 28,
    efficiency: "100%",
    status: "Complete",
  },
  {
    date: "2026-07-04",
    shift: "Morning",
    line: "Casting Line A",
    outputItem: "Foundry Sand Cast Block",
    plannedQty: 200,
    actualQty: 188,
    efficiency: "94.0%",
    status: "On Target",
  },
];

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
  const filteredRows = PRODUCTION_ROWS.filter(
    (row) =>
      isWithinDateRange(row.date, fromDate, toDate) &&
      matchesEntityFilter(
        `${row.line} ${row.shift} ${row.outputItem} ${row.status}`,
        entityFilter
      )
  );

  return (
    <article className="rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
      <header className="border-b border-corporate-border px-4 py-3">
        <h3 className="text-sm font-bold text-corporate-text">Daily Production Summary</h3>
        <p className="text-xs text-corporate-muted">
          Shift-wise output, efficiency, and floor production logs
        </p>
      </header>
      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
        <table className={MASTER_LIST_TABLE_CLASS}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Shift</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Production Line</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Output Item</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Planned</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actual</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Efficiency</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filteredRows.map((row) => (
              <tr key={`${row.date}-${row.line}-${row.shift}`}>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.shift}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.line}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.outputItem}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.plannedQty}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                  {row.actualQty}
                </td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.efficiency}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold",
                      row.status === "Complete"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : row.status === "Minor Shortfall"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-corporate-border bg-corporate-bg text-corporate-text"
                    )}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
