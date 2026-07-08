"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MASTER_LIST_HEADER_CELL_CLASS } from "./universal-master-list";

export type PipelineBulkActionKind = "approve" | "reject";

export function usePipelineRowSelection(resetKey: string) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [resetKey]);

  const toggleRow = useCallback((id: string) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const getSelectionState = useCallback(
    (visibleSelectableIds: string[]) => {
      const selectedVisibleCount = visibleSelectableIds.filter((id) =>
        selectedRowIds.has(id)
      ).length;
      const allSelected =
        visibleSelectableIds.length > 0 &&
        selectedVisibleCount === visibleSelectableIds.length;
      const isIndeterminate = selectedVisibleCount > 0 && !allSelected;

      const toggleSelectAll = () => {
        if (allSelected) {
          setSelectedRowIds((current) => {
            const next = new Set(current);
            for (const id of visibleSelectableIds) next.delete(id);
            return next;
          });
        } else {
          setSelectedRowIds((current) => {
            const next = new Set(current);
            for (const id of visibleSelectableIds) next.add(id);
            return next;
          });
        }
      };

      return {
        selectedVisibleCount,
        allSelected,
        isIndeterminate,
        toggleSelectAll,
      };
    },
    [selectedRowIds]
  );

  const deselectRow = useCallback((id: string) => {
    setSelectedRowIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    selectedRowIds,
    selectedCount: selectedRowIds.size,
    toggleRow,
    deselectRow,
    clearSelection,
    getSelectionState,
  };
}

type PipelineSelectAllCheckboxProps = {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel?: string;
};

export function PipelineSelectAllCheckbox({
  checked,
  indeterminate,
  disabled = false,
  onChange,
  ariaLabel = "Select all visible rows",
}: PipelineSelectAllCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
      className="h-4 w-4 rounded border-corporate-border"
    />
  );
}

export function PipelineSelectHeaderCell({
  checked,
  indeterminate,
  disabled,
  onChange,
  ariaLabel,
}: PipelineSelectAllCheckboxProps) {
  return (
    <th className={cn(MASTER_LIST_HEADER_CELL_CLASS, "w-10 text-center")}>
      <PipelineSelectAllCheckbox
        checked={checked}
        indeterminate={indeterminate}
        disabled={disabled}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
    </th>
  );
}

type PipelineBulkActionBarProps = {
  selectedCount: number;
  isBusy: boolean;
  approveLabel: string;
  rejectLabel: string;
  onBulkAction: (action: PipelineBulkActionKind) => void;
};

export function PipelineBulkActionBar({
  selectedCount,
  isBusy,
  approveLabel,
  rejectLabel,
  onBulkAction,
}: PipelineBulkActionBarProps) {
  const [bulkAction, setBulkAction] = useState("");

  if (selectedCount === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-2.5">
      <span className="text-xs font-semibold text-corporate-brand">
        {selectedCount} row(s) selected
      </span>
      <select
        value={bulkAction}
        disabled={isBusy}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "approve" || value === "reject") {
            onBulkAction(value);
            setBulkAction("");
          }
        }}
        className="min-w-[180px] rounded border border-corporate-border bg-white px-2 py-1.5 text-xs font-medium disabled:opacity-50"
        aria-label="Bulk action"
      >
        <option value="">Bulk Action</option>
        <option value="approve">{approveLabel}</option>
        <option value="reject">{rejectLabel}</option>
      </select>
      {isBusy && (
        <span className="inline-flex items-center gap-1.5 text-xs text-corporate-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Processing…
        </span>
      )}
    </div>
  );
}
