"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Landmark, Package, Scale, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DISPLAY_SUB_TYPE_OPTIONS,
  matchesEntityFilter,
  type DisplayReportCriteria,
} from "@/constants/display-criteria-config";
import CashBankSummaryPanel from "./cash-bank-summary-panel";
import MaterialLedgerPanel from "./material-ledger-panel";
import DisplayReportCriteriaWizard, {
  DisplayReportPlaceholder,
} from "./display-report-criteria-wizard";
import { getDefaultDateRange, isWithinDateRange } from "./workspace-date-range-filter";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

const DISPLAY_VIEWS = [
  { id: "daybook", label: "Daybook View", icon: BookOpen },
  { id: "ledgers", label: "Account Ledgers Grid", icon: Landmark },
  { id: "material-ledger", label: "Material Ledger", icon: Package },
  { id: "cash-bank", label: "Cash & Bank Summary", icon: Wallet },
  { id: "trial-balance", label: "Trial Balance Sheet", icon: Scale },
] as const;

type DisplayViewId = (typeof DISPLAY_VIEWS)[number]["id"];

const DAYBOOK_ROWS = [
  { date: "2026-07-01", voucher: "SI-1042", particulars: "Sales Invoice — ABC Traders", debit: "", credit: "1,25,000.00", type: "Sales" },
  { date: "2026-07-02", voucher: "PV-883", particulars: "Purchase — Steel Components", debit: "48,500.00", credit: "", type: "Purchase" },
  { date: "2026-07-03", voucher: "RC-221", particulars: "Receipt — Cash Collection", debit: "32,000.00", credit: "", type: "Receipt" },
  { date: "2026-07-04", voucher: "EX-119", particulars: "Factory Diesel Expense", debit: "12,400.00", credit: "", type: "Expense" },
  { date: "2026-07-05", voucher: "JV-044", particulars: "Salary Accrual Journal", debit: "86,000.00", credit: "86,000.00", type: "Journal" },
];

const LEDGER_ROWS = [
  { date: "2026-07-01", account: "Cash Account", opening: "2,10,000.00", debit: "32,000.00", credit: "18,500.00", closing: "2,23,500.00" },
  { date: "2026-07-02", account: "HDFC Bank", opening: "8,45,000.00", debit: "1,25,000.00", credit: "48,500.00", closing: "9,21,500.00" },
  { date: "2026-07-03", account: "Purchase Account", opening: "0.00", debit: "48,500.00", credit: "0.00", closing: "48,500.00" },
  { date: "2026-07-04", account: "Sales Account", opening: "0.00", debit: "0.00", credit: "1,25,000.00", closing: "1,25,000.00" },
  { date: "2026-07-05", account: "Diesel Expense", opening: "0.00", debit: "12,400.00", credit: "0.00", closing: "12,400.00" },
];

const TRIAL_BALANCE_ROWS = [
  { group: "Assets", account: "Cash & Bank", debit: "11,45,000.00", credit: "0.00" },
  { group: "Assets", account: "Inventory Closing", debit: "6,80,000.00", credit: "0.00" },
  { group: "Liabilities", account: "Creditors Control", debit: "0.00", credit: "3,42,000.00" },
  { group: "Income", account: "Sales Account", debit: "0.00", credit: "12,50,000.00" },
  { group: "Expenses", account: "Purchase & Diesel", debit: "4,95,000.00", credit: "0.00" },
];

function createDraftCriteria(
  viewId: DisplayViewId,
  fromDate: string,
  toDate: string
): DisplayReportCriteria {
  return {
    fromDate,
    toDate,
    reportSubType: DISPLAY_SUB_TYPE_OPTIONS[viewId][0] ?? "Summary View",
    entityFilter: "",
  };
}

function AppliedCriteriaBanner({ criteria }: { criteria: DisplayReportCriteria }) {
  return (
    <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-2 text-xs text-corporate-text">
      Generated report · {criteria.fromDate} to {criteria.toDate} · {criteria.reportSubType}
      {criteria.entityFilter ? ` · Entity: ${criteria.entityFilter}` : ""}
    </div>
  );
}

export default function DisplayPanel() {
  const defaults = getDefaultDateRange();
  const [activeView, setActiveView] = useState<DisplayViewId>("daybook");
  const [draftCriteria, setDraftCriteria] = useState<DisplayReportCriteria>(() =>
    createDraftCriteria("daybook", defaults.fromDate, defaults.toDate)
  );
  const [appliedCriteria, setAppliedCriteria] = useState<DisplayReportCriteria | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    setHasGenerated(false);
    setAppliedCriteria(null);
    setDraftCriteria(createDraftCriteria(activeView, defaults.fromDate, defaults.toDate));
  }, [activeView, defaults.fromDate, defaults.toDate]);

  const handleGenerate = () => {
    setAppliedCriteria({ ...draftCriteria });
    setHasGenerated(true);
  };

  const filteredDaybook = useMemo(() => {
    if (!appliedCriteria) return [];
    return DAYBOOK_ROWS.filter(
      (row) =>
        isWithinDateRange(row.date, appliedCriteria.fromDate, appliedCriteria.toDate) &&
        matchesEntityFilter(
          `${row.particulars} ${row.voucher} ${row.type}`,
          appliedCriteria.entityFilter
        )
    );
  }, [appliedCriteria]);

  const filteredLedgers = useMemo(() => {
    if (!appliedCriteria) return [];
    return LEDGER_ROWS.filter(
      (row) =>
        isWithinDateRange(row.date, appliedCriteria.fromDate, appliedCriteria.toDate) &&
        matchesEntityFilter(row.account, appliedCriteria.entityFilter)
    );
  }, [appliedCriteria]);

  const filteredTrialBalance = useMemo(() => {
    if (!appliedCriteria) return [];
    return TRIAL_BALANCE_ROWS.filter((row) =>
      matchesEntityFilter(`${row.group} ${row.account}`, appliedCriteria.entityFilter)
    );
  }, [appliedCriteria]);

  const renderGeneratedContent = () => {
    if (!hasGenerated || !appliedCriteria) {
      return <DisplayReportPlaceholder />;
    }

    switch (activeView) {
      case "daybook":
        return (
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Voucher</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Particulars</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Type</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Debit</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredDaybook.map((row) => (
                  <tr key={`${row.voucher}-${row.date}`} className="hover:bg-corporate-bg/60">
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium text-corporate-brand")}>
                      {row.voucher}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.particulars}</td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <span className="rounded-full border border-corporate-border bg-corporate-bg px-2.5 py-1 text-xs font-semibold">
                        {row.type}
                      </span>
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-medium")}>
                      {row.debit || "—"}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-medium")}>
                      {row.credit || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "ledgers":
        return (
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Opening</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Debit</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Credit</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredLedgers.map((row) => (
                  <tr key={`${row.account}-${row.date}`} className="hover:bg-corporate-bg/60">
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>{row.account}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right")}>{row.opening}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right text-emerald-700")}>
                      {row.debit}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right text-red-700")}>
                      {row.credit}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-semibold")}>
                      {row.closing}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "material-ledger":
        return (
          <MaterialLedgerPanel
            fromDate={appliedCriteria.fromDate}
            toDate={appliedCriteria.toDate}
            entityFilter={appliedCriteria.entityFilter}
            reportSubType={appliedCriteria.reportSubType}
          />
        );

      case "cash-bank":
        return (
          <CashBankSummaryPanel
            fromDate={appliedCriteria.fromDate}
            toDate={appliedCriteria.toDate}
            entityFilter={appliedCriteria.entityFilter}
            reportSubType={appliedCriteria.reportSubType}
          />
        );

      case "trial-balance":
        return (
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className={MASTER_LIST_TABLE_CLASS}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Group</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Head</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Debit Total</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Credit Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {filteredTrialBalance.map((row) => (
                  <tr key={row.account} className="hover:bg-corporate-bg/60">
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <span className="rounded-full border border-corporate-border bg-corporate-bg px-2.5 py-1 text-xs font-semibold">
                        {row.group}
                      </span>
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>{row.account}</td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-medium")}>
                      {row.debit}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-medium")}>
                      {row.credit}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-corporate-border bg-corporate-bg">
                <tr>
                  <td colSpan={2} className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>
                    Trial Balance Totals
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-bold text-corporate-text")}>
                    23,20,000.00
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-right font-bold text-corporate-text")}>
                    23,20,000.00
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );

      default:
        return <DisplayReportPlaceholder />;
    }
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="Display workspace">
      <div className="border-b border-corporate-border pb-3">
        <h2 className="text-base font-semibold text-corporate-text">Universal Display Hub</h2>
        <p className="text-sm text-corporate-muted">
          Interactive criteria wizard with conditional loading for daybook, ledgers, cash &amp; bank,
          material movement, and trial balance views.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Display views">
        {DISPLAY_VIEWS.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveView(view.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                  : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {view.label}
            </button>
          );
        })}
      </div>

      <DisplayReportCriteriaWizard
        viewId={activeView}
        fromDate={draftCriteria.fromDate}
        toDate={draftCriteria.toDate}
        reportSubType={draftCriteria.reportSubType}
        entityFilter={draftCriteria.entityFilter}
        onFromDateChange={(value) =>
          setDraftCriteria((current) => ({ ...current, fromDate: value }))
        }
        onToDateChange={(value) => setDraftCriteria((current) => ({ ...current, toDate: value }))}
        onReportSubTypeChange={(value) =>
          setDraftCriteria((current) => ({ ...current, reportSubType: value }))
        }
        onEntityFilterChange={(value) =>
          setDraftCriteria((current) => ({ ...current, entityFilter: value }))
        }
        onGenerate={handleGenerate}
      />

      {hasGenerated && appliedCriteria && <AppliedCriteriaBanner criteria={appliedCriteria} />}

      <div className="min-w-0 flex-1">{renderGeneratedContent()}</div>
    </section>
  );
}
