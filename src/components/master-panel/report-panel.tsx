"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Clock3,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WorkspaceDateRangeFilter, {
  getDefaultDateRange,
  isWithinDateRange,
} from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

const STOCK_ROWS = [
  { item: "Hydraulic Pump Assembly", category: "Machine Parts", closingQty: "42", closingValue: "3,78,000.00", status: "Healthy" },
  { item: "Conveyor Belt Roll", category: "Inventory", closingQty: "18", closingValue: "1,12,500.00", status: "Low Stock" },
  { item: "Gear Box Unit", category: "Machine Parts", closingQty: "26", closingValue: "2,45,600.00", status: "Healthy" },
  { item: "Industrial Grease Pack", category: "Inventory", closingQty: "120", closingValue: "48,000.00", status: "Healthy" },
];

const SALES_PURCHASE_SUMMARY = {
  salesTotal: "18,45,000.00",
  purchaseTotal: "11,20,000.00",
  grossMargin: "7,25,000.00",
  marginPercent: "39.3%",
};

const LABOR_ROWS = [
  { date: "2026-07-01", employee: "Ravi Kumar", hours: "9.5", overtime: "1.5", accrual: "1,850.00", status: "Posted" },
  { date: "2026-07-02", employee: "Suresh Patel", hours: "8.0", overtime: "0.0", accrual: "1,200.00", status: "Posted" },
  { date: "2026-07-03", employee: "Amit Singh", hours: "10.0", overtime: "2.0", accrual: "2,100.00", status: "Pending" },
  { date: "2026-07-04", employee: "Vikas Sharma", hours: "8.5", overtime: "0.5", accrual: "1,420.00", status: "Posted" },
];

const VEHICLE_ROWS = [
  { date: "2026-07-01", vehicle: "MH-12-AB-4521", trips: "2", diesel: "4,800.00", netProfit: "12,400.00", cashier: "Pending Accountant" },
  { date: "2026-07-02", vehicle: "MH-14-CD-8832", trips: "1", diesel: "2,150.00", netProfit: "6,900.00", cashier: "Pending Cashier" },
  { date: "2026-07-03", vehicle: "MH-12-AB-4521", trips: "3", diesel: "6,200.00", netProfit: "15,100.00", cashier: "Settled" },
  { date: "2026-07-04", vehicle: "MH-09-EF-1190", trips: "2", diesel: "3,900.00", netProfit: "8,750.00", cashier: "Pending Cashier" },
];

function SummaryBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const styles = {
    neutral: "border-corporate-border bg-corporate-bg text-corporate-text",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
  } as const;

  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", styles[tone])}>
      {label}
    </span>
  );
}

export default function ReportPanel() {
  const defaults = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaults.fromDate);
  const [toDate, setToDate] = useState(defaults.toDate);

  const filteredLabor = useMemo(
    () => LABOR_ROWS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  const filteredVehicles = useMemo(
    () => VEHICLE_ROWS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  const totalDiesel = filteredVehicles.reduce(
    (sum, row) => sum + Number(row.diesel.replace(/[^\d.]/g, "")),
    0
  );

  const pendingCashier = filteredVehicles.filter((row) =>
    row.cashier.toLowerCase().includes("pending")
  ).length;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="Report workspace">
      <div className="border-b border-corporate-border pb-3">
        <h2 className="text-base font-semibold text-corporate-text">
          Universal Reports &amp; Summaries
        </h2>
        <p className="text-sm text-corporate-muted">
          SAP / Busy style premium summary dashboard with stock, sales performance, labor, and
          vehicle logistics analytics.
        </p>
      </div>

      <WorkspaceDateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-corporate-brand" aria-hidden />
            <h3 className="text-sm font-semibold text-corporate-text">Stock Summary Matrix</h3>
          </div>
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Category</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Closing Qty</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Closing Value</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {STOCK_ROWS.map((row) => (
                  <tr key={row.item}>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.item}</td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.category}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.closingQty}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                      {row.closingValue}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <SummaryBadge
                        label={row.status}
                        tone={row.status === "Low Stock" ? "warning" : "success"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-corporate-brand" aria-hidden />
            <h3 className="text-sm font-semibold text-corporate-text">
              Sales &amp; Purchase Performance Analytics
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-corporate-border bg-corporate-bg p-4">
              <p className="text-xs uppercase tracking-wide text-corporate-muted">Sales Total</p>
              <p className="mt-1 text-2xl font-bold text-corporate-text">
                {SALES_PURCHASE_SUMMARY.salesTotal}
              </p>
            </div>
            <div className="rounded-xl border border-corporate-border bg-corporate-bg p-4">
              <p className="text-xs uppercase tracking-wide text-corporate-muted">Purchase Total</p>
              <p className="mt-1 text-2xl font-bold text-corporate-text">
                {SALES_PURCHASE_SUMMARY.purchaseTotal}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Gross Margin</p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <p className="text-2xl font-bold text-emerald-800">
                  {SALES_PURCHASE_SUMMARY.grossMargin}
                </p>
                <SummaryBadge
                  label={`${SALES_PURCHASE_SUMMARY.marginPercent} margin`}
                  tone="success"
                />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-corporate-brand" aria-hidden />
            <h3 className="text-sm font-semibold text-corporate-text">
              Labor &amp; Attendance Summaries
            </h3>
          </div>
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Hours</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Overtime</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Payroll Accrual</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredLabor.map((row) => (
                  <tr key={`${row.date}-${row.employee}`}>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.employee}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.hours}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.overtime}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                      {row.accrual}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <SummaryBadge
                        label={row.status}
                        tone={row.status === "Pending" ? "warning" : "success"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-corporate-brand" aria-hidden />
            <h3 className="text-sm font-semibold text-corporate-text">
              Vehicle Logistics Expense Summary
            </h3>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-corporate-border bg-corporate-bg p-3">
              <p className="text-xs uppercase tracking-wide text-corporate-muted">Total Diesel</p>
              <p className="mt-1 text-lg font-bold text-red-700">
                {totalDiesel.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-corporate-border bg-corporate-bg p-3">
              <p className="text-xs uppercase tracking-wide text-corporate-muted">Pending Cashier</p>
              <p className="mt-1 text-lg font-bold text-amber-700">{pendingCashier}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Net Trip Profit</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">43,150.00</p>
            </div>
          </div>
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Trips</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Diesel</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Net Profit</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Cashier Tally</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredVehicles.map((row) => (
                  <tr key={`${row.date}-${row.vehicle}`}>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.vehicle}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.trips}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right text-red-700")}>
                      {row.diesel}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold text-emerald-700")}>
                      {row.netProfit}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <SummaryBadge
                        label={row.cashier}
                        tone={
                          row.cashier === "Settled"
                            ? "success"
                            : row.cashier.includes("Accountant")
                              ? "warning"
                              : "danger"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
