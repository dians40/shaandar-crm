"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_BULK_IMPORT_COLUMNS,
  finalizeBulkImportRecord,
  type AttendanceBulkImportRecord,
} from "@/types/attendance-bulk-import-row";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type AttendanceBulkImportPreviewGridProps = {
  rows: AttendanceBulkImportRecord[];
  selectedRowIndex: number;
  onSelectedRowIndexChange: (index: number) => void;
};

function safeBulkRow(
  rows: AttendanceBulkImportRecord[],
  index: number | null | undefined
): AttendanceBulkImportRecord | null {
  try {
    if (index == null || !Number.isFinite(index)) return null;
    if (!Array.isArray(rows) || index < 0 || index >= rows.length) return null;
    const row = rows[index];
    if (!row) return null;
    return finalizeBulkImportRecord(row);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default function AttendanceBulkImportPreviewGrid({
  rows,
  selectedRowIndex,
  onSelectedRowIndexChange,
}: AttendanceBulkImportPreviewGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState(selectedRowIndex);

  useEffect(() => {
    try {
      if (selectedRowIndex == null || !Number.isFinite(selectedRowIndex)) return;
      if (selectedRowIndex >= 0 && selectedRowIndex < rows.length) {
        setFocusIndex(selectedRowIndex);
      }
    } catch (error) {
      console.error(error);
    }
  }, [selectedRowIndex, rows.length]);

  useEffect(() => {
    try {
      rowRefs.current = rowRefs.current.slice(0, rows.length);
      if (rows.length === 0) {
        setFocusIndex(-1);
        return;
      }
      setFocusIndex((current) => {
        if (current < 0 || current >= rows.length) {
          onSelectedRowIndexChange(0);
          return 0;
        }
        return current;
      });
    } catch (error) {
      console.error(error);
    }
  }, [onSelectedRowIndexChange, rows.length]);

  const moveFocus = useCallback(
    (nextIndex: number) => {
      try {
        if (!rows || rows.length === 0) return;
        if (nextIndex < 0 || nextIndex >= rows.length) return;
        if (!rows[nextIndex]) return;

        setFocusIndex(nextIndex);
        onSelectedRowIndexChange(nextIndex);

        const targetRow = rowRefs.current[nextIndex];
        if (targetRow) {
          targetRow.focus();
          targetRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      } catch (error) {
        console.error(error);
      }
    },
    [onSelectedRowIndexChange, rows]
  );

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      try {
        if (event.key !== "Enter") return;

        event.preventDefault();
        event.stopPropagation();

        if (!rows || rows.length === 0) return;

        const currentIndex = Number.isFinite(focusIndex) ? focusIndex : 0;
        const currentRow = safeBulkRow(rows, currentIndex);
        if (!currentRow) {
          moveFocus(0);
          return;
        }

        const nextIndex = Math.min(currentIndex + 1, rows.length - 1);
        if (nextIndex === currentIndex) return;

        moveFocus(nextIndex);
      } catch (error) {
        console.error(error);
      }
    },
    [focusIndex, moveFocus, rows]
  );

  const handleRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, index: number | null) => {
      try {
        if (event.key !== "Enter") return;

        event.preventDefault();
        event.stopPropagation();

        if (index == null || !Number.isFinite(index) || index < 0) return;

        const row = safeBulkRow(rows, index);
        if (!row) return;

        const nextIndex = Math.min(index + 1, rows.length - 1);
        if (nextIndex === index) return;

        moveFocus(nextIndex);
      } catch (error) {
        console.error(error);
      }
    },
    [moveFocus, rows]
  );

  return (
    <div
      ref={gridRef}
      tabIndex={0}
      role="grid"
      aria-label="22-column attendance bulk import preview"
      onKeyDown={handleGridKeyDown}
      className={cn(
        MASTER_LIST_TABLE_WRAPPER_CLASS,
        "max-h-[420px] overflow-auto outline-none focus:ring-2 focus:ring-corporate-brand/40"
      )}
    >
      <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[2400px]")}>
        <thead className={MASTER_LIST_HEAD_CLASS}>
          <tr>
            <th className={MASTER_LIST_HEADER_CELL_CLASS}>#</th>
            {ATTENDANCE_BULK_IMPORT_COLUMNS.map((column) => (
              <th key={column.key} className={MASTER_LIST_HEADER_CELL_CLASS}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-corporate-border">
          {!rows || rows.length === 0 ? (
            <tr>
              <td
                colSpan={ATTENDANCE_BULK_IMPORT_COLUMNS.length + 1}
                className="px-3 py-8 text-center text-corporate-muted"
              >
                No bulk import rows to preview.
              </td>
            </tr>
          ) : (
            rows.map((rawRow, index) => {
              try {
                const row = finalizeBulkImportRecord(rawRow);
                const isFocused = index === focusIndex;

                return (
                  <tr
                    key={`bulk-row-${index}-${row.payCode}-${row.cardNumber}`}
                    ref={(element) => {
                      rowRefs.current[index] = element;
                    }}
                    tabIndex={0}
                    role="row"
                    aria-selected={isFocused}
                    onClick={() => moveFocus(index)}
                    onKeyDown={(event) => handleRowKeyDown(event, index)}
                    onFocus={() => {
                      try {
                        setFocusIndex(index);
                        onSelectedRowIndexChange(index);
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    className={cn(
                      "hover:bg-slate-50/70 focus:outline-none focus:ring-1 focus:ring-corporate-brand/50",
                      isFocused && "bg-corporate-brand-light/40"
                    )}
                  >
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                      {index + 1}
                    </td>
                    {ATTENDANCE_BULK_IMPORT_COLUMNS.map((column) => (
                      <td
                        key={`${index}-${column.key}`}
                        className={cn(
                          MASTER_LIST_BODY_CELL_CLASS,
                          "whitespace-nowrap text-xs",
                          (column.key === "shift" ||
                            column.key === "status" ||
                            column.key === "ot") &&
                            "font-semibold text-corporate-brand"
                        )}
                      >
                        {row[column.key] || "—"}
                      </td>
                    ))}
                  </tr>
                );
              } catch (error) {
                console.error(error);
                return (
                  <tr key={`bulk-row-error-${index}`}>
                    <td
                      colSpan={ATTENDANCE_BULK_IMPORT_COLUMNS.length + 1}
                      className="px-3 py-2 text-xs text-amber-800"
                    >
                      Row {index + 1} recovered safely.
                    </td>
                  </tr>
                );
              }
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
