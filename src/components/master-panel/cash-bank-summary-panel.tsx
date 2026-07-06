"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, Wallet } from "lucide-react";
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
  {
    date: "2026-07-05",
    partyName: "Sharma Traders",
    amount: 45000,
    sadhariStatus: "Sadhari Satisfied",
  },
  {
    date: "2026-07-05",
    partyName: "Metro Engineering",
    amount: 28500,
    sadhariStatus: "Partial — Follow Up",
  },
  {
    date: "2026-07-05",
    partyName: "Cash Counter — Gate 1",
    amount: 18200,
    sadhariStatus: "Sadhari Satisfied",
  },
  {
    date: "2026-07-05",
    partyName: "HDFC Bank Transfer — ABC Traders",
    amount: 125000,
    sadhariStatus: "Bank Receipt Cleared",
  },
  {
    date: "2026-07-05",
    partyName: "Patel Packaging",
    amount: 8600,
    sadhariStatus: "Sadhari Satisfied",
  },
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
      {
        date: "2026-07-05",
        voucher: "PY-412",
        particulars: "CNC Line A — Bearing Replacement",
        amount: 6200,
      },
      {
        date: "2026-07-05",
        voucher: "PY-418",
        particulars: "Press Unit B — Hydraulic Seal Kit",
        amount: 3400,
      },
    ],
  },
  {
    id: "labor-overtime",
    head: "Labor Overtime Head",
    type: "general",
    generalItems: [
      {
        date: "2026-07-05",
        voucher: "PY-425",
        particulars: "OT Payout — Assembly Bay C",
        amount: 5600,
      },
      {
        date: "2026-07-05",
        voucher: "PY-431",
        particulars: "OT Payout — Packaging Line D",
        amount: 2800,
      },
    ],
  },
];

function formatRupee(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type CashBankSummaryPanelProps = {
  fromDate: string;
  toDate: string;
  entityFilter?: string;
  reportSubType?: string;
};

export default function CashBankSummaryPanel({
  fromDate,
  toDate,
  entityFilter = "",
  reportSubType = "Summary View",
}: CashBankSummaryPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "vehicle-expenses": true,
    "machine-repairs": true,
    "labor-overtime": true,
  });

  const filteredIncoming = useMemo(
    () =>
      INCOMING_PARTIES.filter(
        (row) =>
          isWithinDateRange(row.date, fromDate, toDate) &&
          matchesEntityFilter(row.partyName, entityFilter)
      ),
    [fromDate, toDate, entityFilter]
  );

  const filteredExpenseGroups = useMemo(
    () =>
      EXPENSE_GROUPS.map((group) => {
        if (group.type === "vehicle" && group.vehicleItems) {
          return {
            ...group,
            vehicleItems: group.vehicleItems.filter(
              (item) =>
                isWithinDateRange(item.date, fromDate, toDate) &&
                matchesEntityFilter(
                  `${item.vehicleNo} ${item.destination} ${item.expenseDetail} ${item.accountHead}`,
                  entityFilter
                ),
            ),
          };
        }
        if (group.type === "general" && group.generalItems) {
          return {
            ...group,
            generalItems: group.generalItems.filter(
              (item) =>
                isWithinDateRange(item.date, fromDate, toDate) &&
                matchesEntityFilter(`${item.voucher} ${item.particulars}`, entityFilter)
            ),
          };
        }
        return group;
      }).filter((group) => {
        if (group.type === "vehicle") return (group.vehicleItems?.length ?? 0) > 0;
        return (group.generalItems?.length ?? 0) > 0;
      }),
    [fromDate, toDate, entityFilter]
  );

  const totalReceipts = useMemo(
    () => filteredIncoming.reduce((sum, row) => sum + row.amount, 0),
    [filteredIncoming]
  );

  const totalPayments = useMemo(
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

  const closingBalance = OPENING_CASH_BANK_BALANCE + totalReceipts - totalPayments;
  const paymentsPlusClosing = totalPayments + closingBalance;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  return (
    <div className="w-full space-y-4" aria-label="Cash and Bank T-shape ledger">
      <div className="flex flex-wrap items-center gap-2 border-b border-corporate-border pb-3">
        <Wallet className="h-5 w-5 text-corporate-brand" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-corporate-text">
            Cash &amp; Bank Summary — T-Shape Ledger
          </h3>
          <p className="text-xs text-corporate-muted">
            {reportSubType}
            {entityFilter ? ` · Filter: ${entityFilter}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* LEFT — Receipts */}
        <article className="flex min-w-0 flex-col rounded-xl border-2 border-emerald-300 bg-corporate-surface shadow-card">
          <header className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
            <ArrowDownToLine className="h-5 w-5 text-emerald-700" aria-hidden />
            <div>
              <h4 className="text-sm font-bold text-emerald-900">Receipts</h4>
              <p className="text-xs text-emerald-800">Incoming funds &amp; party receipts</p>
            </div>
          </header>

          <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Opening Index
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-900">
              Opening Cash/Bank Balance (₹)
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-900 sm:text-3xl">
              {formatRupee(OPENING_CASH_BANK_BALANCE)}
            </p>
          </div>

          <div className="min-w-0 flex-1 p-3">
            <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "border-emerald-200")}>
              <table className={MASTER_LIST_TABLE_CLASS}>
                <thead className={MASTER_LIST_HEAD_CLASS}>
                  <tr>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Party Name</th>
                    <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount Received</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Remark / Sadhari Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corporate-border">
                  {filteredIncoming.map((row) => (
                    <tr key={`${row.date}-${row.partyName}`}>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                        {row.partyName}
                      </td>
                      <td
                        className={cn(
                          MASTER_LIST_BODY_CELL_CLASS,
                          "text-right font-semibold text-emerald-700"
                        )}
                      >
                        {formatRupee(row.amount)}
                      </td>
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-1 text-xs font-semibold",
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
                <tfoot className="border-t-2 border-emerald-300 bg-emerald-50">
                  <tr>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-emerald-900")}>
                      Total Receipts Sum
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        "text-right text-base font-bold text-emerald-800"
                      )}
                    >
                      {formatRupee(totalReceipts)}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </article>

        {/* RIGHT — Payments */}
        <article className="flex min-w-0 flex-col rounded-xl border-2 border-red-300 bg-corporate-surface shadow-card">
          <header className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-3">
            <ArrowUpFromLine className="h-5 w-5 text-red-700" aria-hidden />
            <div>
              <h4 className="text-sm font-bold text-red-900">Payments</h4>
              <p className="text-xs text-red-800">Head-wise &amp; vehicle expense outflows</p>
            </div>
          </header>

          <div className="min-w-0 flex-1 space-y-2 p-3">
            {filteredExpenseGroups.map((group) => {
              const isExpanded = expandedGroups[group.id] ?? true;
              const groupTotal =
                group.type === "vehicle"
                  ? (group.vehicleItems?.reduce((sum, item) => sum + item.amount, 0) ?? 0)
                  : (group.generalItems?.reduce((sum, item) => sum + item.amount, 0) ?? 0);

              return (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-lg border border-corporate-border bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full min-h-11 items-center justify-between bg-corporate-bg px-3 py-2 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-corporate-muted transition-transform",
                          isExpanded ? "rotate-0" : "-rotate-90"
                        )}
                        aria-hidden
                      />
                      <span className="text-sm font-bold text-corporate-text">{group.head}</span>
                    </div>
                    <span className="text-sm font-bold text-red-700">{formatRupee(groupTotal)}</span>
                  </button>

                  {isExpanded && group.type === "vehicle" && group.vehicleItems && (
                    <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0")}>
                      <table className="min-w-full text-sm">
                        <thead className={MASTER_LIST_HEAD_CLASS}>
                          <tr>
                            <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle No.</th>
                            <th className={MASTER_LIST_HEADER_CELL_CLASS}>Destination</th>
                            <th className={MASTER_LIST_HEADER_CELL_CLASS}>Expense Type</th>
                            <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount</th>
                            <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Head</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-corporate-border">
                          {group.vehicleItems.map((item) => (
                            <tr key={`${item.vehicleNo}-${item.expenseDetail}`}>
                              <td
                                className={cn(
                                  MASTER_LIST_BODY_CELL_CLASS,
                                  "font-bold text-corporate-brand"
                                )}
                              >
                                {item.vehicleNo}
                              </td>
                              <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.destination}</td>
                              <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.expenseDetail}</td>
                              <td
                                className={cn(
                                  MASTER_LIST_BODY_CELL_CLASS,
                                  "text-right font-semibold text-red-700"
                                )}
                              >
                                {formatRupee(item.amount)}
                              </td>
                              <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.accountHead}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isExpanded && group.type === "general" && group.generalItems && (
                    <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0")}>
                      <table className="min-w-full text-sm">
                        <thead className={MASTER_LIST_HEAD_CLASS}>
                          <tr>
                            <th className={MASTER_LIST_HEADER_CELL_CLASS}>Voucher</th>
                            <th className={MASTER_LIST_HEADER_CELL_CLASS}>Expense Details</th>
                            <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount</th>
                            <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Head</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-corporate-border">
                          {group.generalItems.map((item) => (
                            <tr key={item.voucher}>
                              <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                                {item.voucher}
                              </td>
                              <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.particulars}</td>
                              <td
                                className={cn(
                                  MASTER_LIST_BODY_CELL_CLASS,
                                  "text-right font-semibold text-red-700"
                                )}
                              >
                                {formatRupee(item.amount)}
                              </td>
                              <td className={MASTER_LIST_BODY_CELL_CLASS}>{group.head}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 border-t border-red-200 bg-red-50/40 px-4 py-4">
            <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
                Carry Forward
              </p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <p className="text-sm font-bold text-corporate-text">
                  Closing Balance / Carry Forward (₹)
                </p>
                <p className="text-2xl font-bold text-corporate-brand">
                  {formatRupee(closingBalance)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-red-900">Total Payments + Closing Balance</p>
                <p className="text-lg font-bold text-red-800">{formatRupee(paymentsPlusClosing)}</p>
              </div>
              <p className="mt-1 text-xs text-red-700">
                Payments {formatRupee(totalPayments)} + Closing {formatRupee(closingBalance)}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
