"use client";

import { RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type LayerFilterControlsProps = {
  fromDate: string;
  toDate: string;
  searchQuery: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  summary?: string;
  searchPlaceholder?: string;
  idPrefix?: string;
};

export default function LayerFilterControls({
  fromDate,
  toDate,
  searchQuery,
  onFromDateChange,
  onToDateChange,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  summary,
  searchPlaceholder = "Search records...",
  idPrefix = "layer-filter",
}: LayerFilterControlsProps) {
  const hasDateFilter = Boolean(fromDate || toDate);

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

        {hasDateFilter && (
          <button
            type="button"
            onClick={() => {
              onFromDateChange("");
              onToDateChange("");
            }}
            className="h-10 rounded-lg border border-corporate-border bg-white px-4 text-sm font-medium text-corporate-text hover:bg-corporate-bg"
          >
            Clear Dates
          </button>
        )}
      </div>
    </section>
  );
}
