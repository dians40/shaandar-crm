"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_SALARY_WAGES_REPORT_ID,
  isSalaryWagesReportId,
  REPORT_CATEGORIES,
} from "@/constants/reports-navigation";
import SalaryWagesReportView from "./reports/salary-wages-report-view";
import WorkspaceDateRangeFilter, {
  getDefaultDateRange,
  isWithinDateRange,
} from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";
import { cn } from "@/lib/utils";

const STOCK_ROWS = [
  { item: "Hydraulic Pump Assembly", category: "Machine Parts", closingQty: "42", closingValue: "3,78,000.00", status: "Healthy", date: "2026-07-01" },
  { item: "Conveyor Belt Roll", category: "Inventory", closingQty: "18", closingValue: "1,12,500.00", status: "Low Stock", date: "2026-07-02" },
];

const VEHICLE_ROWS = [
  { date: "2026-07-01", vehicle: "MH-12-AB-4521", trips: "2", diesel: "4,800.00", netProfit: "12,400.00", cashier: "Pending Accountant" },
  { date: "2026-07-02", vehicle: "MH-14-CD-8832", trips: "1", diesel: "2,150.00", netProfit: "6,900.00", cashier: "Pending Cashier" },
];

export default function ReportPanel() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const reportParam = searchParams.get("report");
  const defaults = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaults.fromDate);
  const [toDate, setToDate] = useState(defaults.toDate);

  const activeReportId = isSalaryWagesReportId(reportParam)
    ? reportParam
    : DEFAULT_SALARY_WAGES_REPORT_ID;

  const showSalaryWagesReport =
    categoryParam === "salary-wages" || isSalaryWagesReportId(reportParam);

  const filteredStock = useMemo(
    () => STOCK_ROWS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  const filteredVehicles = useMemo(
    () => VEHICLE_ROWS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  if (showSalaryWagesReport) {
    return (
      <SalaryWagesReportView
        reportId={activeReportId}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
      />
    );
  }

  const salaryWagesCategory = REPORT_CATEGORIES.find((cat) => cat.id === "salary-wages");

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="Report workspace">
      <div className="border-b border-corporate-border pb-3">
        <h2 className="text-base font-semibold text-corporate-text">
          Universal Reports &amp; Summaries
        </h2>
        <p className="text-sm text-corporate-muted">
          Select a Salary and Wages report from the sidebar, or review legacy summary matrices below.
        </p>
      </div>

      {salaryWagesCategory && (
        <div className="rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
          <h3 className="text-sm font-semibold text-corporate-text">
            {salaryWagesCategory.label}
          </h3>
          <p className="mt-1 text-sm text-corporate-muted">{salaryWagesCategory.description}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {salaryWagesCategory.reports.map((report) => (
              <li
                key={report.id}
                className="rounded-lg border border-corporate-border bg-corporate-bg px-3 py-2 text-sm text-corporate-text"
              >
                {report.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <WorkspaceDateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-corporate-text">Stock Summary Matrix</h3>
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Category</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Closing Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredStock.map((row) => (
                  <tr key={row.item}>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.item}</td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.category}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>
                      {row.closingQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-corporate-text">
            Vehicle Logistics Expense Summary
          </h3>
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredVehicles.map((row) => (
                  <tr key={`${row.date}-${row.vehicle}`}>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.vehicle}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                      {row.netProfit}
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
