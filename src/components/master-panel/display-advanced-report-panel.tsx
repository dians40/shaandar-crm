"use client";

import { cn } from "@/lib/utils";
import type { DisplayReportCriteria } from "@/constants/display-criteria-config";
import { matchesEntityFilter } from "@/constants/display-criteria-config";
import { getReportTypeDefinition } from "@/constants/display-report-types";
import ManufacturingStockLedgerPanel from "./manufacturing-stock-ledger-panel";
import MaterialLedgerPanel from "./material-ledger-panel";
import DailyProductionSummaryPanel from "./daily-production-summary-panel";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

const PROFIT_LOSS_ROWS = [
  { head: "Sales Revenue", amount: "18,45,000.00", type: "Income" },
  { head: "Direct Expenses", amount: "11,20,000.00", type: "Expense" },
  { head: "Gross Profit", amount: "7,25,000.00", type: "Result" },
  { head: "Administrative Overheads", amount: "2,10,000.00", type: "Expense" },
  { head: "Net Profit", amount: "5,15,000.00", type: "Result" },
];

const OUTSTANDING_ROWS = [
  {
    party: "ABC Traders — Pune",
    type: "Receivable",
    overdueDays: 45,
    balance: "1,25,000.00",
    sadhariStatus: "Overdue",
  },
  {
    party: "Shree Steel Suppliers",
    type: "Payable",
    overdueDays: 12,
    balance: "48,500.00",
    sadhariStatus: "Within Terms",
  },
  {
    party: "Metro Engineering",
    type: "Receivable",
    overdueDays: 62,
    balance: "86,400.00",
    sadhariStatus: "Critical Overdue",
  },
];

const PAYROLL_ROWS = [
  {
    employee: "Ravi Kumar",
    type: "Internal",
    attendance: "Present",
    hours: "9.5",
    overtime: "1.5",
    machine: "Press Line 3",
  },
  {
    employee: "Patel Contractors — Batch 4",
    type: "Contractor",
    attendance: "Present",
    hours: "8.0",
    overtime: "0.0",
    machine: "Assembly Floor",
  },
];

type DisplayAdvancedReportPanelProps = {
  criteria: DisplayReportCriteria;
  activeView: string;
};

export default function DisplayAdvancedReportPanel({
  criteria,
  activeView,
}: DisplayAdvancedReportPanelProps) {
  const report = getReportTypeDefinition(criteria.reportTypeId);
  const reportId = criteria.reportTypeId;

  if (reportId.startsWith("inventory.")) {
    if (reportId === "inventory.universal-summary") {
      return (
        <ManufacturingStockLedgerPanel
          entityFilter={criteria.entityFilter}
          reportSubType={report?.label ?? "Inventory Summary"}
        />
      );
    }

    return (
      <div className="space-y-5">
        <ManufacturingStockLedgerPanel
          entityFilter={criteria.entityFilter}
          reportSubType={report?.label ?? "Stock Summary"}
        />
        <MaterialLedgerPanel
          fromDate={criteria.fromDate}
          toDate={criteria.toDate}
          entityFilter={criteria.entityFilter}
          reportSubType={report?.label ?? "Item-wise Logs"}
        />
      </div>
    );
  }

  if (reportId.startsWith("payroll.")) {
    if (activeView === "daily-production" && reportId === "payroll.daily-attendance") {
      return (
        <DailyProductionSummaryPanel
          fromDate={criteria.fromDate}
          toDate={criteria.toDate}
          entityFilter={criteria.entityFilter}
        />
      );
    }

    const filtered = PAYROLL_ROWS.filter((row) =>
      matchesEntityFilter(`${row.employee} ${row.type} ${row.machine}`, criteria.entityFilter)
    );

    return (
      <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
        <table className={MASTER_LIST_TABLE_CLASS}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee / Contractor</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Type</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Attendance</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Hours</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Overtime</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Machine / Floor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filtered.map((row) => (
              <tr key={row.employee}>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.employee}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.type}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.attendance}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.hours}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.overtime}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.machine}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (reportId.startsWith("outstanding.")) {
    const filtered = OUTSTANDING_ROWS.filter((row) =>
      matchesEntityFilter(`${row.party} ${row.type} ${row.sadhariStatus}`, criteria.entityFilter)
    );

    return (
      <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
        <table className={MASTER_LIST_TABLE_CLASS}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Party</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Type</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Overdue Days</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Balance</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>साधारी Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filtered.map((row) => (
              <tr key={row.party}>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{row.party}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.type}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.overdueDays}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                  {row.balance}
                </td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>
                  <span
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-bold",
                      row.sadhariStatus.includes("Critical")
                        ? "border-red-300 bg-red-50 text-red-700"
                        : row.sadhariStatus === "Overdue"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    )}
                  >
                    {row.sadhariStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (reportId.startsWith("final-results.") || reportId.startsWith("accounts-transaction.")) {
    return (
      <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
        <table className={MASTER_LIST_TABLE_CLASS}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Head</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Category</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {PROFIT_LOSS_ROWS.filter((row) =>
              matchesEntityFilter(`${row.head} ${row.type}`, criteria.entityFilter)
            ).map((row) => (
              <tr key={row.head}>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>{row.head}</td>
                <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.type}</td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-bold")}>
                  {row.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {criteria.transactionFilterMode !== "all" && (
          <p className="border-t border-corporate-border px-4 py-2 text-xs text-corporate-muted">
            Filter:{" "}
            {criteria.transactionFilterMode === "group"
              ? `Group — ${criteria.accountGroupFilter || "All Groups"}`
              : `Account — ${criteria.specificAccountFilter || "Not selected"}`}
          </p>
        )}
      </div>
    );
  }

  return null;
}

export function isAdvancedReportType(reportTypeId: string): boolean {
  return (
    reportTypeId.startsWith("inventory.") ||
    reportTypeId.startsWith("payroll.") ||
    reportTypeId.startsWith("outstanding.") ||
    reportTypeId.startsWith("final-results.")
  );
}
