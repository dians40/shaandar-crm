"use client";

import { RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type LayerFilterControlsProps = {
  fromDate: string;
  toDate: string;
  searchQuery: string;
  departmentFilter?: string;
  designationFilter?: string;
  departmentOptions?: string[];
  designationOptions?: string[];
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDepartmentFilterChange?: (value: string) => void;
  onDesignationFilterChange?: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  summary?: string;
  searchPlaceholder?: string;
  idPrefix?: string;
  showDepartmentDesignationFilters?: boolean;
};

export default function LayerFilterControls({
  fromDate,
  toDate,
  searchQuery,
  departmentFilter = "",
  designationFilter = "",
  departmentOptions = [],
  designationOptions = [],
  onFromDateChange,
  onToDateChange,
  onSearchChange,
  onDepartmentFilterChange,
  onDesignationFilterChange,
  onRefresh,
  isRefreshing = false,
  summary,
  searchPlaceholder = "Search records...",
  idPrefix = "layer-filter",
  showDepartmentDesignationFilters = true,
}: LayerFilterControlsProps) {
  const hasDateFilter = Boolean(fromDate || toDate);
  const hasExtendedFilter = Boolean(departmentFilter || designationFilter);
  const showExtendedFilters =
    showDepartmentDesignationFilters &&
    Boolean(onDepartmentFilterChange && onDesignationFilterChange);

  return (
    <section
      className="rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card"
      aria-label="Date filter and search controls"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-corporate-text">Filter &amp; Search Controls</h4>
          {summary && <p className="text-xs text-corporate-muted">{summary}</p>}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn-secondary inline-flex h-9 items-center gap-2 px-3 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} aria-hidden />
            Refresh
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label
          htmlFor={`${idPrefix}-from-date`}
          className="flex min-w-[160px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted"
        >
          From Date
          <input
            id={`${idPrefix}-from-date`}
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            className="h-10 rounded-lg border border-corporate-border bg-white px-3 text-sm font-normal normal-case text-corporate-text shadow-sm"
          />
        </label>

        <label
          htmlFor={`${idPrefix}-to-date`}
          className="flex min-w-[160px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted"
        >
          To Date
          <input
            id={`${idPrefix}-to-date`}
            type="date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
            className="h-10 rounded-lg border border-corporate-border bg-white px-3 text-sm font-normal normal-case text-corporate-text shadow-sm"
          />
        </label>

        <label
          htmlFor={`${idPrefix}-search`}
          className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted"
        >
          Text Search
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
              aria-hidden
            />
            <input
              id={`${idPrefix}-search`}
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-lg border border-corporate-border bg-white pl-9 pr-3 text-sm font-normal normal-case text-corporate-text shadow-sm"
            />
          </div>
        </label>

        {showExtendedFilters && (
          <>
            <label
              htmlFor={`${idPrefix}-department`}
              className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted"
            >
              Department
              <select
                id={`${idPrefix}-department`}
                value={departmentFilter}
                onChange={(event) => onDepartmentFilterChange?.(event.target.value)}
                className="h-10 rounded-lg border border-corporate-border bg-white px-3 text-sm font-normal normal-case text-corporate-text shadow-sm"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label
              htmlFor={`${idPrefix}-designation`}
              className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-corporate-muted"
            >
              Designation
              <select
                id={`${idPrefix}-designation`}
                value={designationFilter}
                onChange={(event) => onDesignationFilterChange?.(event.target.value)}
                className="h-10 rounded-lg border border-corporate-border bg-white px-3 text-sm font-normal normal-case text-corporate-text shadow-sm"
              >
                <option value="">All Designations</option>
                {designationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {(hasDateFilter || hasExtendedFilter) && (
          <button
            type="button"
            onClick={() => {
              if (hasDateFilter) {
                onFromDateChange("");
                onToDateChange("");
              }
              if (hasExtendedFilter) {
                onDepartmentFilterChange?.("");
                onDesignationFilterChange?.("");
              }
            }}
            className="h-10 rounded-lg border border-corporate-border bg-white px-4 text-sm font-medium text-corporate-text hover:bg-corporate-bg"
          >
            Clear Filters
          </button>
        )}
      </div>
    </section>
  );
}
