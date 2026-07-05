"use client";

import { useMemo } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";
import WorkspaceDateRangeFilter, { isWithinDateRange } from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

type InwardCategory =
  | "Purchase Entries (Goods/Raw Material)"
  | "Other Received Items"
  | "Repairing Items / Parts";

type InwardRow = {
  date: string;
  time: string;
  category: InwardCategory;
  supplier: string;
  item: string;
  quantity: string;
  vehicleLr: string;
};

type SalesOutwardRow = {
  date: string;
  time: string;
  customer: string;
  goods: string;
  quantity: string;
  vehicleNo: string;
};

type DispatchOutwardRow = {
  date: string;
  time: string;
  destination: string;
  goods: string;
  quantity: string;
  vehicleNo: string;
  lrNumber: string;
};

const INWARD_ROWS: InwardRow[] = [
  {
    date: "2026-07-05",
    time: "09:15",
    category: "Purchase Entries (Goods/Raw Material)",
    supplier: "Shree Steel Suppliers",
    item: "MS Round Bar 12mm",
    quantity: "2.5 MT",
    vehicleLr: "MH-14-GT-8821 / LR-4412",
  },
  {
    date: "2026-07-05",
    time: "11:40",
    category: "Other Received Items",
    supplier: "Patel Packaging",
    item: "Corrugated Carton Boxes",
    quantity: "500 Nos",
    vehicleLr: "GJ-06-TR-5520",
  },
  {
    date: "2026-07-05",
    time: "14:05",
    category: "Repairing Items / Parts",
    supplier: "Hydraulic Works",
    item: "Cylinder Seal Kit — Press B",
    quantity: "4 Sets",
    vehicleLr: "Local / CH-778",
  },
  {
    date: "2026-07-05",
    time: "16:20",
    category: "Purchase Entries (Goods/Raw Material)",
    supplier: "Rajasthan Minerals",
    item: "Foundry Sand Grade A",
    quantity: "8.0 MT",
    vehicleLr: "RJ-19-HM-3310 / LR-9921",
  },
];

const SALES_OUTWARD_ROWS: SalesOutwardRow[] = [
  {
    date: "2026-07-05",
    time: "10:30",
    customer: "ABC Traders — Pune",
    goods: "Finished Casting Lot #A-18",
    quantity: "120 Nos",
    vehicleNo: "MH-12-AB-4521",
  },
  {
    date: "2026-07-05",
    time: "15:45",
    customer: "Metro Engineering",
    goods: "Machined Gear Assembly",
    quantity: "36 Nos",
    vehicleNo: "MH-09-EF-1190",
  },
];

const DISPATCH_OUTWARD_ROWS: DispatchOutwardRow[] = [
  {
    date: "2026-07-05",
    time: "10:45",
    destination: "Loading Bay — Gate 2",
    goods: "Dispatch Lot ABC-1042",
    quantity: "120 Nos",
    vehicleNo: "MH-12-AB-4521",
    lrNumber: "LR-DSP-1042",
  },
  {
    date: "2026-07-05",
    time: "16:00",
    destination: "Ahmedabad Depot",
    goods: "Inter-plant Transfer Cartons",
    quantity: "80 Boxes",
    vehicleNo: "GJ-06-TR-5520",
    lrNumber: "LR-DSP-1048",
  },
  {
    date: "2026-07-05",
    time: "17:30",
    destination: "Customer Site — Metro Engg",
    goods: "Gear Assembly Dispatch",
    quantity: "36 Nos",
    vehicleNo: "MH-09-EF-1190",
    lrNumber: "LR-DSP-1051",
  },
];

function VehicleBadge({ vehicleNo }: { vehicleNo: string }) {
  return (
    <span className="inline-flex rounded-full border-2 border-corporate-brand bg-corporate-brand-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-corporate-brand">
      गाड़ी Number: {vehicleNo}
    </span>
  );
}

function CategoryBadge({ label }: { label: InwardCategory }) {
  const tone =
    label === "Purchase Entries (Goods/Raw Material)"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : label === "Other Received Items"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-snug", tone)}>
      {label}
    </span>
  );
}

type MaterialLedgerPanelProps = {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
};

export default function MaterialLedgerPanel({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: MaterialLedgerPanelProps) {
  const filteredInward = useMemo(
    () => INWARD_ROWS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  const filteredSales = useMemo(
    () => SALES_OUTWARD_ROWS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  const filteredDispatch = useMemo(
    () => DISPATCH_OUTWARD_ROWS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  return (
    <div className="space-y-5" aria-label="Material inward outward ledger">
      <WorkspaceDateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={onFromDateChange}
        onToDateChange={onToDateChange}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — Inward / आवक */}
        <article className="min-w-0 rounded-xl border-2 border-emerald-300 bg-corporate-surface shadow-card">
          <header className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
            <ArrowDownToLine className="h-5 w-5 text-emerald-700" aria-hidden />
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Inward Stream / आवक</h3>
              <p className="text-xs text-emerald-800">Purchase, received, and repair material logs</p>
            </div>
          </header>

          <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date / Time</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Category</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>किसने दिया (Supplier)</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Qty</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle / LR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredInward.map((row) => (
                  <tr key={`${row.date}-${row.time}-${row.item}`}>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                      {row.date}
                      <br />
                      <span className="text-corporate-muted">{row.time}</span>
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <CategoryBadge label={row.category} />
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.supplier}</td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.item}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>{row.quantity}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs")}>{row.vehicleLr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Right — Outward / जावक */}
        <article className="min-w-0 space-y-4">
          <header className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5 text-red-700" aria-hidden />
              <div>
                <h3 className="text-sm font-bold text-red-900">Outward &amp; Dispatch / जावक</h3>
                <p className="text-xs text-red-800">Sales entries and dispatch logs for day-end clarity</p>
              </div>
            </div>
          </header>

          <section className="rounded-xl border-2 border-corporate-border bg-corporate-surface shadow-card">
            <div className="border-b border-corporate-border bg-corporate-bg px-4 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-corporate-text">
                Sales Entries
              </p>
            </div>
            <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
              <table className={MASTER_LIST_TABLE_CLASS}>
                <thead className={MASTER_LIST_HEAD_CLASS}>
                  <tr>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date / Time</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>किसको भेजा (Customer)</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Goods</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Qty</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corporate-border">
                  {filteredSales.map((row) => (
                    <tr key={`${row.date}-${row.customer}`}>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                        {row.date}
                        <br />
                        <span className="text-corporate-muted">{row.time}</span>
                      </td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.customer}</td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.goods}</td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>{row.quantity}</td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>
                        <VehicleBadge vehicleNo={row.vehicleNo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border-2 border-corporate-border bg-corporate-surface shadow-card">
            <div className="border-b border-corporate-border bg-corporate-bg px-4 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-corporate-text">
                Dispatch Logs
              </p>
            </div>
            <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
              <table className={MASTER_LIST_TABLE_CLASS}>
                <thead className={MASTER_LIST_HEAD_CLASS}>
                  <tr>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date / Time</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Destination</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Dispatched Goods</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Qty</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>LR No.</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corporate-border">
                  {filteredDispatch.map((row) => (
                    <tr key={`${row.date}-${row.lrNumber}`}>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                        {row.date}
                        <br />
                        <span className="text-corporate-muted">{row.time}</span>
                      </td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.destination}</td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.goods}</td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>{row.quantity}</td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs font-medium")}>{row.lrNumber}</td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>
                        <VehicleBadge vehicleNo={row.vehicleNo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
