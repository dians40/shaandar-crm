"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachBulkRowIds,
  rowIdFromIndex,
  type BulkImportSheetRow,
} from "@/lib/attendance-bulk-import-sheet-processor";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_BULK_IMPORT_COLUMNS,
  normalizeBiometric22ColumnRecord,
  processBulkRowUpdate,
  type Biometric22ColumnRecord,
} from "@/types/attendance-bulk-import-row";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type EditingCell = {
  rowIndex: number;
  columnKey: keyof Biometric22ColumnRecord;
} | null;

type AttendanceBulkImportPreviewGridProps = {
  rows: Biometric22ColumnRecord[];
  selectedRowIndex: number;
  onSelectedRowIndexChange: (index: number) => void;
  onRowsChange?: (rows: Biometric22ColumnRecord[]) => void;
};

function safeBulkRow(
  rows: Biometric22ColumnRecord[],
  index: number | null | undefined
): Biometric22ColumnRecord | null {
  try {
    if (index == null || !Number.isFinite(index)) return null;
    if (!Array.isArray(rows) || index < 0 || index >= rows.length) return null;
    const row = rows[index];
    if (!row) return null;
    return normalizeBiometric22ColumnRecord(row);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function isEnterKey(event: React.KeyboardEvent): boolean {
  return event.key === "Enter" && !event.nativeEvent.isComposing;
}

export default function AttendanceBulkImportPreviewGrid({
  rows: rowsProp,
  selectedRowIndex,
  onSelectedRowIndexChange,
  onRowsChange,
}: AttendanceBulkImportPreviewGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [localRows, setLocalRows] = useState<BulkImportSheetRow[]>(() =>
    attachBulkRowIds(rowsProp ?? [])
  );
  const [focusIndex, setFocusIndex] = useState(selectedRowIndex);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    try {
      setLocalRows(attachBulkRowIds(rowsProp ?? []));
    } catch (error) {
      console.error(error);
    }
  }, [rowsProp]);

  useEffect(() => {
    try {
      if (selectedRowIndex == null || !Number.isFinite(selectedRowIndex)) return;
      if (selectedRowIndex >= 0 && selectedRowIndex < localRows.length) {
        setFocusIndex(selectedRowIndex);
      }
    } catch (error) {
      console.error(error);
    }
  }, [localRows.length, selectedRowIndex]);

  useEffect(() => {
    try {
      rowRefs.current = rowRefs.current.slice(0, localRows.length);
      if (localRows.length === 0) {
        setFocusIndex(-1);
        setEditingCell(null);
        return;
      }
      setFocusIndex((current) => {
        if (current < 0 || current >= localRows.length) {
          onSelectedRowIndexChange(0);
          return 0;
        }
        return current;
      });
    } catch (error) {
      console.error(error);
    }
  }, [localRows.length, onSelectedRowIndexChange]);

  useEffect(() => {
    try {
      if (editingCell && inlineInputRef.current) {
        inlineInputRef.current.focus();
        inlineInputRef.current.select();
      }
    } catch (error) {
      console.error(error);
    }
  }, [editingCell]);

  const commitRows = useCallback(
    (nextRows: BulkImportSheetRow[]) => {
      try {
        setLocalRows(nextRows);
        onRowsChange?.(
          nextRows.map((row) => normalizeBiometric22ColumnRecord(row))
        );
      } catch (error) {
        console.error(error);
      }
    },
    [onRowsChange]
  );

  const processRowUpdate = useCallback(
    (
      id: string | null | undefined,
      oldRow: Biometric22ColumnRecord | null | undefined,
      newRow: Biometric22ColumnRecord | null | undefined
    ): Biometric22ColumnRecord => {
      try {
        return processBulkRowUpdate(id, oldRow, newRow);
      } catch (error) {
        console.error(error);
        return normalizeBiometric22ColumnRecord(oldRow);
      }
    },
    []
  );

  const onCellEditCommit = useCallback(
    (rowIndex: number | null, columnKey: keyof Biometric22ColumnRecord | null, value: string) => {
      try {
        if (rowIndex == null || columnKey == null || !Number.isFinite(rowIndex)) return;

        const oldRow = safeBulkRow(localRows, rowIndex);
        const id = rowIdFromIndex(rowIndex) || localRows[rowIndex]?.id;
        if (!oldRow || !id) return;

        const updated = processRowUpdate(id, oldRow, {
          ...oldRow,
          [columnKey]: value,
        });

        const nextRows = localRows.map((row, index) =>
          index === rowIndex
            ? { ...normalizeBiometric22ColumnRecord(updated), id: row.id || rowIdFromIndex(index) }
            : row
        );
        commitRows(nextRows);
      } catch (error) {
        console.error(error);
      } finally {
        setEditingCell(null);
        setDraftValue("");
      }
    },
    [commitRows, localRows, processRowUpdate]
  );

  const moveFocus = useCallback(
    (nextIndex: number) => {
      try {
        if (!localRows || localRows.length === 0) return;
        if (nextIndex < 0 || nextIndex >= localRows.length) return;
        if (!localRows[nextIndex]) return;

        setEditingCell(null);
        setDraftValue("");
        setFocusIndex(nextIndex);
        onSelectedRowIndexChange(nextIndex);

        const targetRow = rowRefs.current[nextIndex];
        if (targetRow) {
          targetRow.focus({ preventScroll: true });
          try {
            targetRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
          } catch {
            /* scrollIntoView may fail on detached nodes */
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    [localRows, onSelectedRowIndexChange]
  );

  const handleEnterNavigation = useCallback(
    (currentIndex: number | null | undefined) => {
      try {
        if (currentIndex == null || !Number.isFinite(currentIndex)) return;

        const currentRow = safeBulkRow(localRows, currentIndex);
        if (!currentRow) {
          moveFocus(0);
          return;
        }

        const nextIndex = Math.min(currentIndex + 1, localRows.length - 1);
        if (nextIndex === currentIndex) return;
        moveFocus(nextIndex);
      } catch (error) {
        console.error(error);
      }
    },
    [localRows, moveFocus]
  );

  const handleGridKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      try {
        if (!isEnterKey(event)) return;
        if (editingCell) return;

        event.preventDefault();
        event.stopPropagation();

        if (!localRows || localRows.length === 0) return;

        const currentIndex = Number.isFinite(focusIndex) ? focusIndex : 0;
        handleEnterNavigation(currentIndex);
      } catch (error) {
        console.error(error);
      }
    },
    [editingCell, focusIndex, handleEnterNavigation, localRows]
  );

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      try {
        if (!isEnterKey(event)) return;
        if (editingCell) return;

        event.preventDefault();
        event.stopPropagation();
      } catch (error) {
        console.error(error);
      }
    },
    [editingCell]
  );

  const handleRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, index: number | null) => {
      try {
        if (!isEnterKey(event)) return;

        event.preventDefault();
        event.stopPropagation();

        if (index == null || !Number.isFinite(index) || index < 0) return;

        if (editingCell) {
          onCellEditCommit(editingCell.rowIndex, editingCell.columnKey, draftValue);
          return;
        }

        const row = safeBulkRow(localRows, index);
        if (!row) return;

        handleEnterNavigation(index);
      } catch (error) {
        console.error(error);
      }
    },
    [draftValue, editingCell, handleEnterNavigation, localRows, onCellEditCommit]
  );

  const handleInlineFormKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLInputElement>,
      rowIndex: number,
      columnKey: keyof Biometric22ColumnRecord
    ) => {
      try {
        if (!isEnterKey(event)) return;

        event.preventDefault();
        event.stopPropagation();
        onCellEditCommit(rowIndex, columnKey, draftValue);
      } catch (error) {
        console.error(error);
      }
    },
    [draftValue, onCellEditCommit]
  );

  const beginCellEdit = useCallback(
    (rowIndex: number, columnKey: keyof Biometric22ColumnRecord) => {
      try {
        const row = safeBulkRow(localRows, rowIndex);
        if (!row) return;
        setEditingCell({ rowIndex, columnKey });
        setDraftValue(row[columnKey] ?? "");
        setFocusIndex(rowIndex);
        onSelectedRowIndexChange(rowIndex);
      } catch (error) {
        console.error(error);
      }
    },
    [localRows, onSelectedRowIndexChange]
  );

  return (
    <div
      ref={gridRef}
      tabIndex={-1}
      role="grid"
      aria-label="22-column attendance bulk import preview"
      onKeyDownCapture={handleGridKeyDownCapture}
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
          {!localRows || localRows.length === 0 ? (
            <tr>
              <td
                colSpan={ATTENDANCE_BULK_IMPORT_COLUMNS.length + 1}
                className="px-3 py-8 text-center text-corporate-muted"
              >
                No bulk import rows to preview.
              </td>
            </tr>
          ) : (
            localRows.map((rawRow, index) => {
              try {
                const row = normalizeBiometric22ColumnRecord(rawRow);
                const rowId = rawRow.id || rowIdFromIndex(index);
                const isFocused = index === focusIndex;

                return (
                  <tr
                    key={rowId || `bulk-row-${index}`}
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
                        if (index == null || !Number.isFinite(index)) return;
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
                    {ATTENDANCE_BULK_IMPORT_COLUMNS.map((column) => {
                      const isEditing =
                        editingCell?.rowIndex === index &&
                        editingCell.columnKey === column.key;

                      return (
                        <td
                          key={`${rowId}-${column.key}`}
                          className={cn(
                            MASTER_LIST_BODY_CELL_CLASS,
                            "whitespace-nowrap text-xs",
                            (column.key === "shift" ||
                              column.key === "status" ||
                              column.key === "ot") &&
                              "font-semibold text-corporate-brand"
                          )}
                          onDoubleClick={() => beginCellEdit(index, column.key)}
                        >
                          {isEditing ? (
                            <input
                              ref={inlineInputRef}
                              type="text"
                              value={draftValue}
                              className="w-full min-w-[72px] rounded border border-corporate-border bg-white px-1 py-0.5 text-xs"
                              onChange={(event) => {
                                try {
                                  setDraftValue(event.target.value);
                                } catch (error) {
                                  console.error(error);
                                }
                              }}
                              onKeyDown={(event) =>
                                handleInlineFormKeyDown(event, index, column.key)
                              }
                              onBlur={() => {
                                try {
                                  onCellEditCommit(index, column.key, draftValue);
                                } catch (error) {
                                  console.error(error);
                                }
                              }}
                            />
                          ) : (
                            row[column.key] || "—"
                          )}
                        </td>
                      );
                    })}
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
