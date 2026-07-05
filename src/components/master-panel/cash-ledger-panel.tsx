"use client";

import { useMemo } from "react";
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

type CashReceipt = {
  date: string;
  voucher: string;
  particulars: string;
  amount: number;
};

type ExpenseItem = {
  date: string;
  voucher: string;
  particulars: string;
  amount: number;
};

type ExpenseHead = {
  head: string;
  items: ExpenseItem[];
};

const OPENING_CASH_BALANCE = 125000;

const CASH_RECEIPTS: CashReceipt[] = [
  { date: "2026-07-01", voucher: "RC-101", particulars: "Cash Sales Collection — Morning Shift", amount: 18500 },
  { date: "2026-07-01", voucher: "RC-102", particulars: "Advance Receipt — Sharma Traders", amount: 12000 },
  { date: "2026-07-02", voucher: "RC-108", particulars: "Counter Collection — Dispatch Gate", amount: 22400 },
  { date: "2026-07-03", voucher: "RC-115", particulars: "Petty Cash Replenishment Return", amount: 8500 },
];

const EXPENSE_HEADS: ExpenseHead[] = [
  {
    head: "Fuel Head",
    items: [
      { date: "2026-07-01", voucher: "PY-301", particulars: "Diesel — Trip MH-12-AB-4521", amount: 4800 },
      { date: "2026-07-02", voucher: "PY-308", particulars: "Diesel — Local Delivery Route", amount: 2150 },
    ],
  },
  {
    head: "Machine Repairs Head",
    items: [
      { date: "2026-07-01", voucher: "PY-312", particulars: "CNC Line A — Bearing Replacement", amount: 6200 },
      { date: "2026-07-03", voucher: "PY-319", particulars: "Press Unit B — Hydraulic Seal Kit", amount: 3400 },
    ],
  },
  {
    head: "Labor Overtime Head",
    items: [
      { date: "2026-07-02", voucher: "PY-325", particulars: "OT Payout — Assembly Bay C (4 workers)", amount: 5600 },
      { date: "2026-07-03", voucher: "PY-331", particulars: "OT Payout — Packaging Line D", amount: 2800 },
    ],
  },
];

function formatRupee(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type CashLedgerPanelProps = {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
};

export default function CashLedgerPanel({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: CashLedgerPanelProps) {
  const filteredReceipts = useMemo(
    () => CASH_RECEIPTS.filter((row) => isWithinDateRange(row.date, fromDate, toDate)),
    [fromDate, toDate]
  );

  const filteredExpenseHeads = useMemo(
    () =>
      EXPENSE_HEADS.map((group) => ({
        ...group,
        items: group.items.filter((item) => isWithinDateRange(item.date, fromDate, toDate)),
      })).filter((group) => group.items.length > 0),
    [fromDate, toDate]
  );

  const receiptsTotal = useMemo(
    () => filteredReceipts.reduce((sum, row) => sum + row.amount, 0),
    [filteredReceipts]
  );

  const paymentsTotal = useMemo(
    () =>
      filteredExpenseHeads.reduce(
        (sum, group) => sum + group.items.reduce((headSum, item) => headSum + item.amount, 0),
        0
      ),
    [filteredExpenseHeads]
  );

  const subTotal = OPENING_CASH_BALANCE + receiptsTotal;
  const closingBalance = subTotal - paymentsTotal;

  return (
    <div className="space-y-5" aria-label="Marwari style cash ledger">
      <WorkspaceDateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={onFromDateChange}
        onToDateChange={onToDateChange}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <article className="rounded-xl border-2 border-corporate-border bg-amber-50/60 p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-corporate-muted">
            Opening Index
          </p>
          <p className="mt-2 text-sm font-medium text-corporate-text">Opening Cash Balance</p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-corporate-text">
            {formatRupee(OPENING_CASH_BALANCE)}
          </p>
        </article>

        <article className="rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
          <p className="text-sm font-semibold text-corporate-text">Marwari Cash Book — Daily Stream</p>
          <p className="mt-1 text-xs text-corporate-muted">
            Traditional accounts book layout with receipts stream, head-wise payments, and closing
            balance summary.
          </p>
        </article>
      </div>

      <div>
        <h3 className="mb-3 border-b border-corporate-border pb-2 text-sm font-bold uppercase tracking-wide text-corporate-text">
          Receipts Stream (Cash In)
        </h3>
        <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
          <table className={MASTER_LIST_TABLE_CLASS}>
            <thead className={MASTER_LIST_HEAD_CLASS}>
              <tr>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Voucher</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Particulars</th>
                <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {filteredReceipts.map((row) => (
                <tr key={`${row.voucher}-${row.date}`}>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium text-corporate-brand")}>
                    {row.voucher}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.particulars}</td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold text-emerald-700")}>
                    {formatRupee(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-emerald-300 bg-emerald-50">
              <tr>
                <td colSpan={3} className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-bold text-emerald-900")}>
                  Sub-Total (Cash In Hand + Receipts)
                </td>
                <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right text-lg font-bold text-emerald-800")}>
                  {formatRupee(subTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-3 border-b border-corporate-border pb-2 text-sm font-bold uppercase tracking-wide text-corporate-text">
          Head-Wise Expenses Stack (Cash Out)
        </h3>
        <div className="space-y-4">
          {filteredExpenseHeads.map((group) => {
            const headTotal = group.items.reduce((sum, item) => sum + item.amount, 0);

            return (
              <div
                key={group.head}
                className="overflow-hidden rounded-xl border border-corporate-border bg-corporate-surface shadow-card"
              >
                <div className="flex items-center justify-between border-b border-corporate-border bg-corporate-bg px-4 py-3">
                  <p className="font-bold text-corporate-text">{group.head}</p>
                  <p className="text-sm font-bold text-red-700">{formatRupee(headTotal)}</p>
                </div>
                <table className="min-w-full">
                  <tbody className="divide-y divide-corporate-border">
                    {group.items.map((item) => (
                      <tr key={`${group.head}-${item.voucher}`} className="bg-white">
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "w-28")}>{item.date}</td>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "w-24 font-medium")}>
                          {item.voucher}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{item.particulars}</td>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "w-36 text-right font-medium text-red-700")}>
                          {formatRupee(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border-2 border-corporate-border bg-corporate-bg p-5 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-double border-corporate-text pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-muted">
              Final Summary
            </p>
            <p className="mt-1 text-lg font-bold text-corporate-text">Closing Cash Balance (₹)</p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-corporate-text">
            {formatRupee(closingBalance)}
          </p>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-corporate-muted sm:grid-cols-3">
          <p>Opening: {formatRupee(OPENING_CASH_BALANCE)}</p>
          <p>+ Receipts: {formatRupee(receiptsTotal)}</p>
          <p>− Payments: {formatRupee(paymentsTotal)}</p>
        </div>
      </div>
    </div>
  );
}
