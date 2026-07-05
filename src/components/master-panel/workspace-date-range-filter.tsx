"use client";

type WorkspaceDateRangeFilterProps = {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
};

export default function WorkspaceDateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: WorkspaceDateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-corporate-border bg-corporate-surface px-4 py-3 shadow-card">
      <div>
        <label
          htmlFor="workspace-from-date"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
        >
          From Date
        </label>
        <input
          id="workspace-from-date"
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          className="input-field min-w-[160px]"
        />
      </div>
      <div>
        <label
          htmlFor="workspace-to-date"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
        >
          To Date
        </label>
        <input
          id="workspace-to-date"
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          className="input-field min-w-[160px]"
        />
      </div>
      <p className="pb-2 text-xs text-corporate-muted">
        Ledger and summary rows filter instantly by selected range.
      </p>
    </div>
  );
}

export function isWithinDateRange(
  entryDate: string,
  fromDate: string,
  toDate: string
): boolean {
  if (!fromDate && !toDate) return true;
  if (fromDate && entryDate < fromDate) return false;
  if (toDate && entryDate > toDate) return false;
  return true;
}

export function getDefaultDateRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: today.toISOString().slice(0, 10),
  };
}
