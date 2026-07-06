"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesEntityFilter } from "@/constants/display-criteria-config";
import { isWithinDateRange } from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

export type OperationalDayBookCategory =
  | "PURCHASE"
  | "CASH/FINANCE"
  | "LABOR"
  | "MATERIAL"
  | "PRODUCTION";

export type OperationalDayBookRow = {
  date: string;
  time: string;
  reference: string;
  particulars: string;
  category: OperationalDayBookCategory;
  debit: string;
  credit: string;
  vehicleNo?: string;
};

const CATEGORY_BADGE_CLASS: Record<OperationalDayBookCategory, string> = {
  PURCHASE: "border-blue-300 bg-blue-50 text-blue-800",
  "CASH/FINANCE": "border-emerald-300 bg-emerald-50 text-emerald-800",
  LABOR: "border-amber-300 bg-amber-50 text-amber-900",
  MATERIAL: "border-purple-300 bg-purple-50 text-purple-800",
  PRODUCTION: "border-orange-300 bg-orange-50 text-orange-800",
};

const OPERATIONAL_DAYBOOK_ROWS: OperationalDayBookRow[] = [
  {
    date: "2026-07-05",
    time: "08:15",
    reference: "PV-883",
    particulars: "Purchase Entry — MS Round Bar 12mm from Shree Steel Suppliers",
    category: "PURCHASE",
    debit: "48,500.00",
    credit: "",
    vehicleNo: "MH-14-GT-8821",
  },
  {
    date: "2026-07-05",
    time: "09:00",
    reference: "ATT-104",
    particulars: "Manual Attendance — Ravi Kumar Present · OT 1.5 hrs · Press Line 3",
    category: "LABOR",
    debit: "",
    credit: "",
  },
  {
    date: "2026-07-05",
    time: "09:30",
    reference: "INW-221",
    particulars: "Material Inward Receipt — Corrugated Carton Boxes (500 Nos)",
    category: "MATERIAL",
    debit: "",
    credit: "",
    vehicleNo: "GJ-06-TR-5520",
  },
  {
    date: "2026-07-05",
    time: "10:30",
    reference: "RC-442",
    particulars: "Cash Receipt — Sharma Traders collection at Gate 1",
    category: "CASH/FINANCE",
    debit: "",
    credit: "45,000.00",
  },
  {
    date: "2026-07-05",
    time: "10:45",
    reference: "DSP-1042",
    particulars: "Material Outward Dispatch — Finished Casting Lot #A-18 to Pune",
    category: "MATERIAL",
    debit: "",
    credit: "",
    vehicleNo: "MH-12-AB-4521",
  },
  {
    date: "2026-07-05",
    time: "11:00",
    reference: "SI-1042",
    particulars: "Sales Entry — ABC Traders invoice for Machined Gear Assembly",
    category: "PURCHASE",
    debit: "",
    credit: "1,25,000.00",
    vehicleNo: "MH-12-AB-4521",
  },
  {
    date: "2026-07-05",
    time: "12:00",
    reference: "LAB-88",
    particulars: "Contractor shift log — Patel Contractors Batch 4 · 18 present / 2 absent",
    category: "LABOR",
    debit: "",
    credit: "",
  },
  {
    date: "2026-07-05",
    time: "13:30",
    reference: "EX-119",
    particulars: "Vehicle diesel expense — Pune Depot outbound trip",
    category: "CASH/FINANCE",
    debit: "4,800.00",
    credit: "",
    vehicleNo: "MH-12-AB-4521",
  },
  {
    date: "2026-07-05",
    time: "14:30",
    reference: "PRD-A18",
    particulars: "Production Batch A-18 — Casting Line A · 142/150 units · 94.7% efficiency",
    category: "PRODUCTION",
    debit: "",
    credit: "",
  },
  {
    date: "2026-07-05",
    time: "15:00",
    reference: "STK-77",
    particulars: "Stock floor audit — Raw sand grade A excess +8 MT over reorder threshold",
    category: "MATERIAL",
    debit: "",
    credit: "",
  },
  {
    date: "2026-07-05",
    time: "16:00",
    reference: "PRD-G36",
    particulars: "Production Batch G-36 — Machining Bay 2 · 36 gear assemblies completed",
    category: "PRODUCTION",
    debit: "",
    credit: "",
  },
  {
    date: "2026-07-05",
    time: "17:00",
    reference: "PY-425",
    particulars: "Labor OT payout — Assembly Bay C overtime settlement",
    category: "CASH/FINANCE",
    debit: "5,600.00",
    credit: "",
  },
];

function CategoryBadge({ category }: { category: OperationalDayBookCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-1 text-xs font-semibold",
        CATEGORY_BADGE_CLASS[category]
      )}
    >
      [{category}]
    </span>
  );
}

type OperationalDayBookPanelProps = {
  fromDate: string;
  toDate: string;
  entityFilter?: string;
};

export default function OperationalDayBookPanel({
  fromDate,
  toDate,
  entityFilter = "",
}: OperationalDayBookPanelProps) {
  const filteredRows = useMemo(
    () =>
      OPERATIONAL_DAYBOOK_ROWS.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(
            `${row.particulars} ${row.reference} ${row.category} ${row.vehicleNo ?? ""}`,
            entityFilter
          )
      ).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [entityFilter, fromDate, toDate]
  );

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<OperationalDayBookCategory, number>> = {};
    for (const row of filteredRows) {
      counts[row.category] = (counts[row.category] ?? 0) + 1;
    }
    return counts;
  }, [filteredRows]);

  return (
    <div className="w-full space-y-4" aria-label="Integrated operational day book">
      <div className="flex flex-col gap-3 border-b border-corporate-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-corporate-text">
              All-In-One Operations Day Book
            </h3>
            <p className="text-xs text-corporate-muted">
              Stock, labor, finance, and production logs unified for the selected date range
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_BADGE_CLASS) as OperationalDayBookCategory[]).map((cat) => (
            <span
              key={cat}
              className={cn(
                "inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold",
                CATEGORY_BADGE_CLASS[cat]
              )}
            >
              {cat}: {categoryCounts[cat] ?? 0}
            </span>
          ))}
        </div>
      </div>

      <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
        <table className={MASTER_LIST_TABLE_CLASS}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date / Time</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Reference</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Category</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Particulars</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Debit</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  No operational transactions match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={`${row.reference}-${row.time}`} className="hover:bg-corporate-bg/50">
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                    {row.date}
                    <br />
                    <span className="text-corporate-muted">{row.time}</span>
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium text-corporate-brand")}>
                    {row.reference}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <CategoryBadge category={row.category} />
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.particulars}</td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs font-semibold")}>
                    {row.vehicleNo ?? "—"}
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-medium")}>
                    {row.debit || "—"}
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-medium")}>
                    {row.credit || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
