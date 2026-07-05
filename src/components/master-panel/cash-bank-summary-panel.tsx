"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import WorkspaceDateRangeFilter, { isWithinDateRange } from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

type IncomingPartyRow = {
  date: string;
  partyName: string;
  amount: number;
  sadhariStatus: string;
};

type VehicleExpenseRow = {
  date: string;
  vehicleNo: string;
  destination: string;
  expenseDetail: string;
  amount: number;
  accountHead: string;
};

type GeneralExpenseRow = {
  date: string;
  voucher: string;
  particulars: string;
  amount: number;
};

type ExpenseGroup = {
  id: string;
  head: string;
  type: "vehicle" | "general";
  vehicleItems?: VehicleExpenseRow[];
  generalItems?: GeneralExpenseRow[];
};

const OPENING_CASH_BANK_BALANCE = 970000;

const INCOMING_PARTIES: IncomingPartyRow[] = [
  { date: "2026-07-05", partyName: "Sharma Traders", amount: 45000, sadhariStatus: "Sadhari Satisfied (साधारी संतुष्टि)" },
  { date: "2026-07-05", partyName: "Metro Engineering", amount: 28500, sadhariStatus: "Partial — Follow Up" },
  { date: "2026-07-05", partyName: "Cash Counter — Gate 1", amount: 18200, sadhariStatus: "Sadhari Satisfied (साधारी संतुष्टि)" },
  { date: "2026-07-05", partyName: "HDFC Bank Transfer — ABC Traders", amount: 125000, sadhariStatus: "Bank Receipt Cleared" },
  { date: "2026-07-05", partyName: "Patel Packaging", amount: 8600, sadhariStatus: "Sadhari Satisfied (साधारी संतुष्टि)" },
];

const EXPENSE_GROUPS: ExpenseGroup[] = [
  {
    id: "vehicle-expenses",
    head: "Vehicle Expenses Group",
    type: "vehicle",
    vehicleItems: [
      {
        date: "2026-07-05",
        vehicleNo: "MH-12-AB-4521",
        destination: "Pune Depot",
        expenseDetail: "Diesel — Outbound Trip",
        amount: 4800,
        accountHead: "Fuel & Logistics",
      },
      {
        date: "2026-07-05",
        vehicleNo: "MH-09-EF-1190",
        destination: "Ahmedabad Route",
        expenseDetail: "Toll & Route Charges",
        amount: 1650,
        accountHead: "Fuel & Logistics",
      },
      {
        date: "2026-07-05",
        vehicleNo: "GJ-06-TR-5520",
        destination: "Local Dispatch Loop",
        expenseDetail: "Diesel — Local Delivery",
        amount: 2150,
        accountHead: "Fuel & Logistics",
      },
    ],
  },
  {
    id: "machine-repairs",
    head: "Machine Repairs Head",
    type: "general",
    generalItems: [
      { date: "2026-07-05", voucher: "PY-412", particulars: "CNC Line A — Bearing Replacement", amount: 6200 },
      { date: "2026-07-05", voucher: "PY-418", particulars: "Press Unit B — Hydraulic Seal Kit", amount: 3400 },
    ],
  },
  {
    id: "labor-overtime",
    head: "Labor Overtime Head",
    type: "general",
    generalItems: [
      { date: "2026-07-05", voucher: "PY-425", particulars: "OT Payout — Assembly Bay C", amount: 5600 },
      { date: "2026-07-05", voucher: "PY-431", particulars: "OT Payout — Packaging Line D", amount: 2800 },
    ],
  },
];

function formatRupee(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type CashBankSummaryPanelProps = {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
};

export default function CashBankSummaryPanel({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: CashBankSummaryPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "vehicle-expenses": true,
    "machine-repairs": true,
    "labor-overtime": true,
  });

  const filteredIncoming = useMemo(
    () => INCOMING_PARTIES.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  const filteredExpenseGroups = useMemo(
    () =>
      EXPENSE_GROUPS.map((group) => {
        if (group.type === "vehicle" && group.vehicleItems) {
          return {
            ...group,
            vehicleItems: group.vehicleItems.filter((item) =>
              isWithinDateRange(item.date, fromDate, toDate)
            ),
          };
        }
        if (group.type === "general" && group.generalItems) {
          return {
            ...group,
            generalItems: group.generalItems.filter((item) =>
              isWithinDateRange(item.date, fromDate, toDate)
            ),
          };
        }
        return group;
      }).filter((group) => {
        if (group.type === "vehicle") return (group.vehicleItems?.length ?? 0) > 0;
        return (group.generalItems?.length ?? 0) > 0;
      }),
    [fromDate, toDate]
  );

  const totalReceivedToday = useMemo(
    () => filteredIncoming.reduce((sum, row) => sum + row.amount, 0),
    [filteredIncoming]
  );

  const totalExpenses = useMemo(
    () =>
      filteredExpenseGroups.reduce((sum, group) => {
        if (group.type === "vehicle" && group.vehicleItems) {
          return sum + group.vehicleItems.reduce((headSum, item) => headSum + item.amount, 0);
        }
        if (group.type === "general" && group.generalItems) {
          return sum + group.generalItems.reduce((headSum, item) => headSum + item.amount, 0);
        }
        return sum;
      }, 0),
    [filteredExpenseGroups]
  );

  const grandTotal = OPENING_CASH_BANK_BALANCE + totalReceivedToday;
  const closingBalance = grandTotal - totalExpenses;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  return (
    <div className="space-y-5" aria-label="Cash and Bank Summary Ledger">
      <WorkspaceDateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={onFromDateChange}
        onToDateChange={onToDateChange}
      />

      <div className="flex items-center gap-2 border-b border-corporate-border pb-3">
        <Wallet className="h-5 w-5 text-corporate-brand" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-corporate-text">Cash &amp; Bank Summary Ledger</h3>
          <p className="text-xs text-corporate-muted">Daily Book — unified cash and bank movement register</p>
        </div>
      </div>

      {/* Section 1 — Top index & receipts */}
      <section className="space-y-4 rounded-xl border-2 border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-corporate-border bg-corporate-bg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-muted">
              Opening Index
            </p>
            <p className="mt-1 text-sm font-medium text-corporate-text">
              Opening Cash/Bank Balance (₹)
            </p>
            <p className="mt-2 text-3xl font-bold text-corporate-text">
              {formatRupee(OPENING_CASH_BANK_BALANCE)}
            </p>
          </article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Today&apos;s Inflow
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-900">Total Received Today (₹)</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">
              {formatRupee(totalReceivedToday)}
            </p>
          </article>
        </div>

        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-900">
              Grand Total / Sub-Total (₹)
            </p>
            <p className="text-2xl font-bold text-emerald-900">{formatRupee(grandTotal)}</p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-corporate-text">
            Incoming Party Grid
          </h4>
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>
                    Party Name (किसने दिया)
                  </th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount Received (₹)</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>
                    Remark / Sadhari Status (साधारी संतुष्टि)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredIncoming.map((row) => (
                  <tr key={`${row.date}-${row.partyName}`}>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                      {row.partyName}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold text-emerald-700")}>
                      {formatRupee(row.amount)}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          row.sadhariStatus.includes("Satisfied")
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
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
        </div>
      </section>

      {/* Section 2 — Head-wise expenses */}
      <section className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-corporate-text">
          Head-Wise &amp; Vehicle Expenses Audit (Less Expenses Stack)
        </h4>

        {filteredExpenseGroups.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? true;
          const groupTotal =
            group.type === "vehicle"
              ? (group.vehicleItems?.reduce((sum, item) => sum + item.amount, 0) ?? 0)
              : (group.generalItems?.reduce((sum, item) => sum + item.amount, 0) ?? 0);

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-xl border-2 border-corporate-border bg-corporate-surface shadow-card"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between border-b border-corporate-border bg-corporate-bg px-4 py-3 text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-corporate-muted transition-transform",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )}
                    aria-hidden
                  />
                  <p className="font-bold text-corporate-text">{group.head}</p>
                </div>
                <p className="text-sm font-bold text-red-700">{formatRupee(groupTotal)}</p>
              </button>

              {isExpanded && group.type === "vehicle" && group.vehicleItems && (
                <table className="min-w-full">
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle Number (गाड़ी नंबर)</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Destination Station (कहाँ जा रही है)</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Expense Type / Details</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount Paid (₹)</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Head Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {group.vehicleItems.map((item) => (
                      <tr key={`${item.vehicleNo}-${item.expenseDetail}`} className="bg-white">
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-corporate-brand")}>
                          {item.vehicleNo}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.destination}</td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.expenseDetail}</td>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold text-red-700")}>
                          {formatRupee(item.amount)}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.accountHead}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {isExpanded && group.type === "general" && group.generalItems && (
                <table className="min-w-full">
                  <thead className={MASTER_LIST_HEAD_CLASS}>
                    <tr>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Voucher</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Expense Details</th>
                      <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount Paid (₹)</th>
                      <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Head Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-corporate-border">
                    {group.generalItems.map((item) => (
                      <tr key={item.voucher} className="bg-white">
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.date}</td>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>{item.voucher}</td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.particulars}</td>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold text-red-700")}>
                          {formatRupee(item.amount)}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{group.head}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-red-900">Total Aggregated Expenses</p>
            <p className="text-lg font-bold text-red-800">{formatRupee(totalExpenses)}</p>
          </div>
        </div>
      </section>

      {/* Section 3 — Closing & carry forward */}
      <section className="rounded-xl border-2 border-corporate-border bg-corporate-bg p-5 shadow-card">
        <div className="space-y-3 border-b-4 border-double border-corporate-text pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-corporate-text">Grand Total</span>
            <span className="font-semibold">{formatRupee(grandTotal)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-red-700">
            <span className="font-medium">Less: Total Aggregated Expenses</span>
            <span className="font-semibold">− {formatRupee(totalExpenses)}</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border-2 border-corporate-brand bg-corporate-brand-light px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
                Carry Forward Block
              </p>
              <p className="mt-1 text-lg font-bold text-corporate-text">
                Closing Balance / Carry Forward (₹)
              </p>
            </div>
            <p className="text-3xl font-bold tracking-tight text-corporate-brand">
              {formatRupee(closingBalance)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
