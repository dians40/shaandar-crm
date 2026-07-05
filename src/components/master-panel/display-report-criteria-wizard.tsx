"use client";

import { Filter } from "lucide-react";
import type { DisplayCriteriaViewId } from "@/constants/display-criteria-config";
import {
  DISPLAY_ENTITY_LABELS,
  DISPLAY_ENTITY_SUGGESTIONS,
  DISPLAY_SUB_TYPE_OPTIONS,
} from "@/constants/display-criteria-config";

export type DisplayReportCriteriaWizardProps = {
  viewId: DisplayCriteriaViewId;
  fromDate: string;
  toDate: string;
  reportSubType: string;
  entityFilter: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onReportSubTypeChange: (value: string) => void;
  onEntityFilterChange: (value: string) => void;
  onGenerate: () => void;
};

export default function DisplayReportCriteriaWizard({
  viewId,
  fromDate,
  toDate,
  reportSubType,
  entityFilter,
  onFromDateChange,
  onToDateChange,
  onReportSubTypeChange,
  onEntityFilterChange,
  onGenerate,
}: DisplayReportCriteriaWizardProps) {
  const subTypeOptions = DISPLAY_SUB_TYPE_OPTIONS[viewId];
  const entityLabel = DISPLAY_ENTITY_LABELS[viewId];
  const entitySuggestions = DISPLAY_ENTITY_SUGGESTIONS[viewId];

  return (
    <section
      className="rounded-xl border-2 border-corporate-border bg-corporate-surface p-5 shadow-card"
      aria-label="Report criteria selection panel"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-corporate-border pb-3">
        <Filter className="h-5 w-5 text-corporate-brand" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-corporate-text">
            Criteria Selection Panel
          </h3>
          <p className="text-xs text-corporate-muted">
            Choose filters below, then generate the display report grid.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label
            htmlFor={`${viewId}-from-date`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
          >
            From Date
          </label>
          <input
            id={`${viewId}-from-date`}
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            className="input-field w-full"
          />
        </div>

        <div>
          <label
            htmlFor={`${viewId}-to-date`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
          >
            To Date
          </label>
          <input
            id={`${viewId}-to-date`}
            type="date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
            className="input-field w-full"
          />
        </div>

        <div>
          <label
            htmlFor={`${viewId}-sub-type`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
          >
            Report Sub-Type
          </label>
          <select
            id={`${viewId}-sub-type`}
            value={reportSubType}
            onChange={(event) => onReportSubTypeChange(event.target.value)}
            className="input-field w-full"
          >
            {subTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`${viewId}-entity-filter`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
          >
            {entityLabel}
          </label>
          <input
            id={`${viewId}-entity-filter`}
            type="text"
            list={`${viewId}-entity-suggestions`}
            value={entityFilter}
            onChange={(event) => onEntityFilterChange(event.target.value)}
            placeholder="Type or select entity..."
            className="input-field w-full"
          />
          <datalist id={`${viewId}-entity-suggestions`}>
            {entitySuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-corporate-muted">
          Sub-type: <span className="font-semibold text-corporate-text">{reportSubType}</span>
        </p>
        <button
          type="button"
          onClick={onGenerate}
          className="rounded-full border border-corporate-brand bg-corporate-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-corporate-brand/90"
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
        Please choose your report criteria above and click Generate Report.
      </p>
    </div>
  );
}
