"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Factory, Landmark, Package, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createDefaultDisplayCriteria,
  matchesEntityFilter,
  type DisplayReportCriteria,
} from "@/constants/display-criteria-config";
import { formatReportTypeLabel, getReportTypeDefinition } from "@/constants/display-report-types";
import CashBankSummaryPanel from "./cash-bank-summary-panel";
import MaterialLedgerPanel from "./material-ledger-panel";
import DailyProductionSummaryPanel from "./daily-production-summary-panel";
import OperationalDayBookPanel from "./operational-day-book-panel";
import DisplayAdvancedReportPanel, {
  isAdvancedReportType,
} from "./display-advanced-report-panel";
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
  { id: "daybook", label: "Day Book View", icon: BookOpen },
  { id: "ledgers", label: "Account Ledger Grid", icon: Landmark },
  { id: "material-ledger", label: "Material Ledger", icon: Package },
  { id: "cash-bank", label: "Cash Bank Summary", icon: Wallet },
  { id: "daily-production", label: "Daily Production Summary", icon: Factory },
] as const;

type DisplayViewId = (typeof DISPLAY_VIEWS)[number]["id"];

const LEDGER_ROWS = [
  { date: "2026-07-01", account: "Cash Account", opening: "2,10,000.00", debit: "32,000.00", credit: "18,500.00", closing: "2,23,500.00" },
  { date: "2026-07-02", account: "HDFC Bank", opening: "8,45,000.00", debit: "1,25,000.00", credit: "48,500.00", closing: "9,21,500.00" },
  { date: "2026-07-03", account: "Purchase Account", opening: "0.00", debit: "48,500.00", credit: "0.00", closing: "48,500.00" },
  { date: "2026-07-04", account: "Sales Account", opening: "0.00", debit: "0.00", credit: "1,25,000.00", closing: "1,25,000.00" },
  { date: "2026-07-05", account: "Diesel Expense", opening: "0.00", debit: "12,400.00", credit: "0.00", closing: "12,400.00" },
];

function AppliedCriteriaBanner({ criteria }: { criteria: DisplayReportCriteria }) {
  const report = getReportTypeDefinition(criteria.reportTypeId);

  return (
    <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-2 text-xs text-corporate-text">
      Generated report · {criteria.fromDate} to {criteria.toDate} ·{" "}
      {report ? formatReportTypeLabel(report) : criteria.reportTypeId}
      {criteria.entityFilter ? ` · Entity: ${criteria.entityFilter}` : ""}
    </div>
  );
}

export default function DisplayPanel() {
  const defaults = getDefaultDateRange();
  const [activeView, setActiveView] = useState<DisplayViewId>("daybook");
  const [draftCriteria, setDraftCriteria] = useState<DisplayReportCriteria>(() =>
    createDefaultDisplayCriteria("daybook", defaults.fromDate, defaults.toDate)
  );
  const [appliedCriteria, setAppliedCriteria] = useState<DisplayReportCriteria | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    setHasGenerated(false);
    setAppliedCriteria(null);
    setDraftCriteria(createDefaultDisplayCriteria(activeView, defaults.fromDate, defaults.toDate));
  }, [activeView, defaults.fromDate, defaults.toDate]);

  const handleGenerate = () => {
    setAppliedCriteria({ ...draftCriteria });
    setHasGenerated(true);
  };

  const filteredLedgers = useMemo(() => {
    if (!appliedCriteria) return [];
    return LEDGER_ROWS.filter(
      (row) =>
        isWithinDateRange(row.date, appliedCriteria.fromDate, appliedCriteria.toDate) &&
        matchesEntityFilter(row.account, appliedCriteria.entityFilter)
    );
  }, [appliedCriteria]);

  const renderTabContent = (criteria: DisplayReportCriteria) => {
    switch (activeView) {
      case "daybook":
        return (
          <OperationalDayBookPanel
            fromDate={criteria.fromDate}
            toDate={criteria.toDate}
            entityFilter={criteria.entityFilter}
          />
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
            fromDate={criteria.fromDate}
            toDate={criteria.toDate}
            entityFilter={criteria.entityFilter}
            reportSubType={getReportTypeDefinition(criteria.reportTypeId)?.label ?? "Summary View"}
          />
        );

      case "cash-bank":
        return (
          <CashBankSummaryPanel
            fromDate={criteria.fromDate}
            toDate={criteria.toDate}
            entityFilter={criteria.entityFilter}
            reportSubType={getReportTypeDefinition(criteria.reportTypeId)?.label ?? "Summary View"}
          />
        );

      case "daily-production":
        return (
          <DailyProductionSummaryPanel
            fromDate={criteria.fromDate}
            toDate={criteria.toDate}
            entityFilter={criteria.entityFilter}
          />
        );

      default:
        return <DisplayReportPlaceholder />;
    }
  };

  const renderGeneratedContent = () => {
    if (!hasGenerated || !appliedCriteria) {
      return <DisplayReportPlaceholder />;
    }

    if (isAdvancedReportType(appliedCriteria.reportTypeId)) {
      return (
        <DisplayAdvancedReportPanel criteria={appliedCriteria} activeView={activeView} />
      );
    }

    return renderTabContent(appliedCriteria);
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="Display workspace">
      <div className="border-b border-corporate-border pb-3">
        <h2 className="text-base font-semibold text-corporate-text">Universal Display Hub</h2>
        <p className="text-sm text-corporate-muted">
          Day book, ledgers, material movement, cash &amp; bank, and daily production views with
          advanced hierarchical report criteria.
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
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                  : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {view.label}
            </button>
          );
        })}
      </div>

      <DisplayReportCriteriaWizard
        viewId={activeView}
        criteria={draftCriteria}
        onCriteriaChange={(patch) =>
          setDraftCriteria((current) => ({ ...current, ...patch }))
        }
        onGenerate={handleGenerate}
      />

      {hasGenerated && appliedCriteria && <AppliedCriteriaBanner criteria={appliedCriteria} />}

      <div className="min-w-0 flex-1">{renderGeneratedContent()}</div>
    </section>
  );
}
