"use client";

import { Filter } from "lucide-react";
import type { DisplayCriteriaViewId, DisplayReportCriteria } from "@/constants/display-criteria-config";
import { DISPLAY_ENTITY_SUGGESTIONS } from "@/constants/display-criteria-config";
import {
  ACCOUNT_GROUP_SUGGESTIONS,
  ACCOUNT_SUGGESTIONS,
  formatReportTypeLabel,
  getReportTypeDefinition,
  REPORT_TYPE_CATEGORIES,
  TRANSACTION_FILTER_OPTIONS,
  type TransactionFilterMode,
} from "@/constants/display-report-types";

export type DisplayReportCriteriaWizardProps = {
  viewId: DisplayCriteriaViewId;
  criteria: DisplayReportCriteria;
  onCriteriaChange: (patch: Partial<DisplayReportCriteria>) => void;
  onGenerate: () => void;
};

const fieldLabelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-muted sm:text-sm";

export default function DisplayReportCriteriaWizard({
  viewId,
  criteria,
  onCriteriaChange,
  onGenerate,
}: DisplayReportCriteriaWizardProps) {
  const reportConfig = getReportTypeDefinition(criteria.reportTypeId);
  const entitySuggestions = DISPLAY_ENTITY_SUGGESTIONS[viewId];

  const showDateRange = reportConfig?.requiresDateRange ?? true;
  const showTransactionFilter = reportConfig?.showTransactionFilter ?? false;
  const showEntityFilter = reportConfig?.showEntityFilter ?? false;
  const showAccountGroupFilter =
    reportConfig?.showAccountGroupFilter ||
    (showTransactionFilter && criteria.transactionFilterMode === "group");
  const showSpecificAccountFilter =
    reportConfig?.showSpecificAccountFilter ||
    (showTransactionFilter && criteria.transactionFilterMode === "specific");

  return (
    <section
      className="rounded-xl border-2 border-corporate-border bg-corporate-surface p-4 shadow-card sm:p-5"
      aria-label="Advanced criteria selection panel"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-corporate-border pb-3">
        <Filter className="h-5 w-5 text-corporate-brand" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-corporate-text">Criteria Selection Panel</h3>
          <p className="text-xs text-corporate-muted">
            Select a report module, configure filters, then generate the display grid.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={`${viewId}-report-type`} className={fieldLabelClass}>
            Report Type
          </label>
          <select
            id={`${viewId}-report-type`}
            value={criteria.reportTypeId}
            onChange={(event) =>
              onCriteriaChange({
                reportTypeId: event.target.value,
                transactionFilterMode: "all",
                accountGroupFilter: "",
                specificAccountFilter: "",
                entityFilter: "",
              })
            }
            className="select-field h-12 min-h-[48px] w-full text-base"
          >
            {REPORT_TYPE_CATEGORIES.map((category) => (
              <optgroup
                key={category.id}
                label={`${category.label} (${category.labelHi})`}
              >
                {category.reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {formatReportTypeLabel(report)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {reportConfig && showDateRange && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor={`${viewId}-from-date`} className={fieldLabelClass}>
                From Date
              </label>
              <input
                id={`${viewId}-from-date`}
                type="date"
                value={criteria.fromDate}
                onChange={(event) => onCriteriaChange({ fromDate: event.target.value })}
                className="input-field h-12 min-h-[48px] w-full text-base"
              />
            </div>

            <div>
              <label htmlFor={`${viewId}-to-date`} className={fieldLabelClass}>
                To Date
              </label>
              <input
                id={`${viewId}-to-date`}
                type="date"
                value={criteria.toDate}
                onChange={(event) => onCriteriaChange({ toDate: event.target.value })}
                className="input-field h-12 min-h-[48px] w-full text-base"
              />
            </div>

            {showTransactionFilter && (
              <div>
                <label htmlFor={`${viewId}-transaction-filter`} className={fieldLabelClass}>
                  Transaction Filter Mode
                </label>
                <select
                  id={`${viewId}-transaction-filter`}
                  value={criteria.transactionFilterMode}
                  onChange={(event) =>
                    onCriteriaChange({
                      transactionFilterMode: event.target.value as TransactionFilterMode,
                      accountGroupFilter: "",
                      specificAccountFilter: "",
                    })
                  }
                  className="select-field h-12 min-h-[48px] w-full text-base"
                >
                  {TRANSACTION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {(showAccountGroupFilter || showSpecificAccountFilter || showEntityFilter) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {showAccountGroupFilter && (
              <div>
                <label htmlFor={`${viewId}-account-group`} className={fieldLabelClass}>
                  Account Group Selection
                </label>
                <input
                  id={`${viewId}-account-group`}
                  type="text"
                  list={`${viewId}-account-group-suggestions`}
                  value={criteria.accountGroupFilter}
                  onChange={(event) =>
                    onCriteriaChange({ accountGroupFilter: event.target.value })
                  }
                  placeholder="Select account group..."
                  className="input-field h-12 min-h-[48px] w-full text-base"
                />
                <datalist id={`${viewId}-account-group-suggestions`}>
                  {ACCOUNT_GROUP_SUGGESTIONS.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>
            )}

            {showSpecificAccountFilter && (
              <div>
                <label htmlFor={`${viewId}-specific-account`} className={fieldLabelClass}>
                  Specific Account
                </label>
                <input
                  id={`${viewId}-specific-account`}
                  type="text"
                  list={`${viewId}-account-suggestions`}
                  value={criteria.specificAccountFilter}
                  onChange={(event) =>
                    onCriteriaChange({ specificAccountFilter: event.target.value })
                  }
                  placeholder="Type or select account..."
                  className="input-field h-12 min-h-[48px] w-full text-base"
                />
                <datalist id={`${viewId}-account-suggestions`}>
                  {ACCOUNT_SUGGESTIONS.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>
            )}

            {showEntityFilter && (
              <div>
                <label htmlFor={`${viewId}-entity-filter`} className={fieldLabelClass}>
                  {reportConfig?.entityFilterLabel ?? "Entity Search"}
                </label>
                <input
                  id={`${viewId}-entity-filter`}
                  type="text"
                  list={`${viewId}-entity-suggestions`}
                  value={criteria.entityFilter}
                  onChange={(event) => onCriteriaChange({ entityFilter: event.target.value })}
                  placeholder="Type or select..."
                  className="input-field h-12 min-h-[48px] w-full text-base"
                />
                <datalist id={`${viewId}-entity-suggestions`}>
                  {entitySuggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-corporate-muted">
          Report:{" "}
          <span className="font-semibold text-corporate-text">
            {reportConfig ? formatReportTypeLabel(reportConfig) : criteria.reportTypeId}
          </span>
        </p>
        <button
          type="button"
          onClick={onGenerate}
          className="btn-primary h-12 min-h-[48px] rounded-full px-6 text-base font-bold shadow-sm"
        >
          Generate Report / रिपोर्ट देखें
        </button>
      </div>
    </section>
  );
}

export function DisplayReportPlaceholder() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-corporate-border bg-corporate-bg px-6 py-10 text-center">
      <p className="max-w-lg text-sm leading-relaxed text-corporate-muted">
        Select a report type and criteria above, then click Generate Report.
      </p>
    </div>
  );
}
