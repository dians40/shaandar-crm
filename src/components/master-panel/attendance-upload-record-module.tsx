"use client";

import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeAttendanceDateIso,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";
import AttendanceBulkImportPreviewGrid from "./attendance-bulk-import-preview-grid";
import type { PendingAutoEmployee } from "@/lib/attendance-auto-provision";

export type UploadRecordModulePreview = {
  fileName: string;
  bulkRows: Biometric23ColumnRecord[];
  pendingNewEmployees: PendingAutoEmployee[];
  alignmentInfo?: string;
  reportDate?: string;
};

type AttendanceUploadRecordModuleProps = {
  importPreview: UploadRecordModulePreview | null;
  selectedBulkRowIndex: number;
  onSelectedBulkRowIndexChange: (index: number) => void;
  onBulkRowsChange: (rows: Biometric23ColumnRecord[]) => void;
  onFileInputChange: (file: File) => void;
  onProcessSave: () => void;
  isParsing: boolean;
  isProcessing: boolean;
  isDragging: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importMessage: string | null;
  importError: string | null;
  dbConnected: boolean | null;
};

export default function AttendanceUploadRecordModule({
  importPreview,
  selectedBulkRowIndex,
  onSelectedBulkRowIndexChange,
  onBulkRowsChange,
  onFileInputChange,
  onProcessSave,
  isParsing,
  isProcessing,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  fileInputRef,
  importMessage,
  importError,
  dbConnected,
}: AttendanceUploadRecordModuleProps) {
  const uploadBusy = isParsing || isProcessing;
  const reportDate = importPreview
    ? normalizeAttendanceDateIso(
        importPreview.reportDate || importPreview.bulkRows[0]?.date || ""
      )
    : "";

  return (
    <section
      className="min-h-[260px] rounded-xl border-2 border-corporate-brand/30 bg-corporate-surface p-5 shadow-card"
      aria-label="Layer 1 — Upload record editor — 22 column Excel staging"
    >
      <div className="flex flex-wrap items-start gap-3 border-b border-corporate-border pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-corporate-brand-light text-corporate-brand">
          <FileSpreadsheet className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-corporate-brand">
            Layer 1
          </p>
          <h3 className="text-base font-bold text-corporate-text">
            Upload Record Editor
          </h3>
          <p className="mt-1 text-xs text-corporate-muted">
            Upload Excel, edit all 22 biometric columns (plus Date = 23 fields), then{" "}
            <strong>Save to Server</strong>. After save, rows advance to Layer 2 (staging review),
            then Layer 3 (live workflow). Committed records appear in Layer 4.
          </p>
          {dbConnected === false && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Database not connected — saves use browser session or cloud storage fallback.
            </p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          isDragging
            ? "border-corporate-brand bg-corporate-brand-light/50"
            : "border-corporate-border bg-corporate-bg",
          uploadBusy && "pointer-events-none opacity-70"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isParsing ? (
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-corporate-brand" aria-hidden />
        ) : (
          <Upload className="mb-2 h-8 w-8 text-corporate-muted" aria-hidden />
        )}
        <p className="text-sm font-medium text-corporate-text">
          {isDragging ? "Drop file to upload" : "Drag and drop or select biometric Excel"}
        </p>
        <p className="mt-1 text-xs text-corporate-muted">
          22 Excel columns · double-click any cell to edit before save
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-corporate-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          <Upload className="h-4 w-4" aria-hidden />
          Choose File
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.pdf,.csv"
            className="sr-only"
            disabled={uploadBusy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileInputChange(file);
            }}
          />
        </label>
      </div>

      {importPreview && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-3">
            <div>
              <p className="text-sm font-bold text-corporate-brand">
                Staging: {importPreview.bulkRows.length} row(s) — edit below, then save
              </p>
              <p className="text-xs text-corporate-muted">
                {importPreview.fileName} · Report date: <strong>{reportDate}</strong> ·{" "}
                {importPreview.pendingNewEmployees.length} new employee(s)
              </p>
            </div>
            <button
              type="button"
              onClick={onProcessSave}
              disabled={isProcessing || importPreview.bulkRows.length === 0}
              className="btn-primary inline-flex h-11 min-h-[44px] items-center gap-2 px-5 text-sm"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              {isProcessing ? "Saving to server..." : "Save to Server"}
            </button>
          </div>

          {importPreview.alignmentInfo && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <p className="font-semibold">Column alignment</p>
              <p className="mt-1">{importPreview.alignmentInfo}</p>
            </div>
          )}

          <AttendanceBulkImportPreviewGrid
            rows={importPreview.bulkRows}
            selectedRowIndex={selectedBulkRowIndex}
            onSelectedRowIndexChange={onSelectedBulkRowIndexChange}
            onRowsChange={onBulkRowsChange}
          />
        </div>
      )}

      {!importPreview && (
        <p className="mt-4 text-center text-xs text-corporate-muted">
          No staging rows — upload a file to populate the 22-column editor grid.
        </p>
      )}

      {importMessage && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {importMessage}
        </p>
      )}
      {importError && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {importError}
        </p>
      )}
    </section>
  );
}
