"use client";

import { useCallback, useRef, useState } from "react";
import { CalendarCheck, FileSpreadsheet, Save, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createAutoProvisionedEmployee,
  detectPendingAutoEmployees,
  readAutoProvisionedEmployees,
  resolveImportEmployee,
  upsertAutoProvisionedEmployee,
  type PendingAutoEmployee,
} from "@/lib/attendance-auto-provision";
import {
  atomicFinalizeBulkDbPayload,
  buildBulkDbPayload,
  safeBulkNumeric,
} from "@/lib/attendance-bulk-payload-bridge";
import { bulkRecordToWorkflowFields } from "@/types/attendance-bulk-import-row";
import {
  finalizeImportRow,
  parseAttendanceImportFileSafe,
  PDF_UPLOAD_SUCCESS_TOKEN,
  type AttendanceImportRow,
} from "@/lib/attendance-import-parser";
import {
  bulkRecordHasContent,
  normalizeBiometric23ColumnRecord,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";
import AttendanceBulkImportPreviewGrid from "./attendance-bulk-import-preview-grid";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import AttendanceSystemPanel from "./attendance-system-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";

type ImportPreviewState = {
  fileName: string;
  rows: AttendanceImportRow[];
  bulkRows: Biometric23ColumnRecord[];
  pendingNewEmployees: PendingAutoEmployee[];
  skippedRows: number;
  warnings: string[];
  alignmentInfo?: string;
  reportDate?: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  createdEmployees: number;
  errors: string[];
};

function mappedStatusFromRecord(record: {
  assignedMachine?: string;
}): import("@/types/manual-attendance-entry").ManualAttendanceStatus {
  try {
    const token = record.assignedMachine ?? "";
    if (token.includes("G11")) return "G11";
    return "DY1";
  } catch {
    return "DY1";
  }
}

function safeBulkNumericFromRecord(record: {
  assignedMachine?: string;
}): number {
  try {
    const token = record.assignedMachine ?? "";
    const match = token.match(/Overtime Amount:\s*([$0-9.]+)/i);
    if (match?.[1]) return safeBulkNumeric(match[1]);
    return 0;
  } catch {
    return 0;
  }
}

const BULK_SAVE_TIMEOUT_MS = 15_000;

export default function AttendanceLoggingWorkspacePanel() {
  const { employees, prependEmployee } = useEmployees();
  const { ingestManualEntry } = useAttendanceWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [selectedBulkRowIndex, setSelectedBulkRowIndex] = useState(0);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const autoProvisionMissingEmployees = (
    rows: AttendanceImportRow[],
    registry: ReturnType<typeof readAutoProvisionedEmployees>
  ) => {
    const pending = detectPendingAutoEmployees(rows, employees, registry);
    let nextRegistry = registry;
    let createdCount = 0;

    for (const pendingEmployee of pending) {
      const created = createAutoProvisionedEmployee(
        pendingEmployee.employeeCode,
        pendingEmployee.employeeName
      );
      nextRegistry = upsertAutoProvisionedEmployee(created);
      prependEmployee(created);
      createdCount += 1;
    }

    return { pending, nextRegistry, createdCount };
  };

  const handleFileSelect = async (file: File) => {
    setImportMessage(null);
    setImportError(null);
    setIsParsing(true);

    try {
      const outcome = await parseAttendanceImportFileSafe(file);

      if (outcome.pdfDocumentUploaded) {
        setImportPreview(null);
        setImportMessage(PDF_UPLOAD_SUCCESS_TOKEN);
        return;
      }

      const { rows: parsedRows, bulkRows: parsedBulkRows, skippedRows, warnings, alignmentInfo, reportDate } =
        outcome;

      const sanitizedRows = Array.isArray(parsedRows)
        ? parsedRows.map((row) => finalizeImportRow(row))
        : [];
      const sanitizedBulkRows = Array.isArray(parsedBulkRows)
        ? parsedBulkRows.map((row) =>
            normalizeBiometric23ColumnRecord(row, { defaultDate: reportDate })
          )
        : [];

      if (sanitizedBulkRows.length === 0) {
        setImportPreview(null);
        setSelectedBulkRowIndex(0);
        setImportError(
          "No valid attendance rows found in the uploaded file. Check that the sheet contains employee data rows."
        );
        return;
      }

      const registry = readAutoProvisionedEmployees();
      const { pending: pendingNewEmployees, createdCount } = autoProvisionMissingEmployees(
        sanitizedRows,
        registry
      );

      setSelectedBulkRowIndex(0);
      setImportPreview({
        fileName: file.name,
        rows: sanitizedRows,
        bulkRows: sanitizedBulkRows,
        pendingNewEmployees,
        skippedRows,
        reportDate,
        alignmentInfo,
        warnings:
          createdCount > 0
            ? [
                ...warnings,
                `${createdCount} missing employee profile(s) were auto-created in this session.`,
              ]
            : warnings,
      });

      if (createdCount > 0) {
        setImportMessage(
          `${createdCount} new employee profile(s) were auto-provisioned from the uploaded sheet.`
        );
      }
    } catch (error) {
      console.error(error);
      setImportPreview(null);
      setImportError(
        "Upload processing completed safely, but no rows could be recovered from this file."
      );
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processBulkImport = useCallback(async () => {
    if (!importPreview) return;

    setImportMessage(null);
    setImportError(null);
    setIsProcessing(true);

    try {
      let registry = readAutoProvisionedEmployees();
      const result: ImportResult = {
        imported: 0,
        skipped: 0,
        createdEmployees: 0,
        errors: [],
      };

      for (const pending of importPreview.pendingNewEmployees) {
        const created = createAutoProvisionedEmployee(
          pending.employeeCode,
          pending.employeeName
        );
        registry = upsertAutoProvisionedEmployee(created);
        prependEmployee(created);
        result.createdEmployees += 1;
      }

      const bulkPayloadRows: Record<string, unknown>[] = [];

      for (const bulkRow of importPreview.bulkRows) {
        try {
          const safeBulk = normalizeBiometric23ColumnRecord(bulkRow, {
            defaultDate: importPreview.reportDate,
          });
          if (!bulkRecordHasContent(safeBulk)) {
            result.skipped += 1;
            continue;
          }
          const mapped = bulkRecordToWorkflowFields(safeBulk);
          const employeeCode = mapped.employeeCode.trim() || "TEMP_CODE";
          const employeeName = mapped.employeeName.trim() || "Unknown Worker";

          let employee = resolveImportEmployee(
            employeeCode,
            employeeName,
            employees,
            registry
          );

          if (!employee) {
            const created = createAutoProvisionedEmployee(employeeCode, employeeName);
            registry = upsertAutoProvisionedEmployee(created);
            prependEmployee(created);
            employee = created;
            result.createdEmployees += 1;
          }

          const dbPayload = atomicFinalizeBulkDbPayload(
            buildBulkDbPayload({
              row: safeBulk,
              employeeId: employee.id,
              attendanceDate: safeBulk.date || importPreview.reportDate || "",
            })
          );

          bulkPayloadRows.push({
            ...dbPayload,
            date: safeBulk.date || importPreview.reportDate || "",
            employee_id: employee.id,
            employee_name: employee.name,
            attendance_date: safeBulk.date || importPreview.reportDate || dbPayload.attendance_date,
          });
        } catch (rowError) {
          console.error(rowError);
          result.skipped += 1;
          result.errors.push(
            rowError instanceof Error ? rowError.message : "Row sanitization failed."
          );
        }
      }

      if (bulkPayloadRows.length === 0) {
        setImportError("No valid rows available for bulk submission.");
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), BULK_SAVE_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch("/api/v1/attendance/workflow/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: bulkPayloadRows }),
          signal: controller.signal,
        });
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          throw new Error(
            "Bulk save timed out after 15 seconds. Please verify database connectivity and try again."
          );
        }
        throw fetchError;
      } finally {
        window.clearTimeout(timeoutId);
      }

      const body = (await response.json()) as {
        error?: string;
        ok?: boolean;
        imported?: number;
        skipped?: number;
        provisionedEmployees?: number;
        errors?: string[];
        debug?: { cause?: string; receivedRows?: number };
        records?: Array<{
          id: string;
          employeeId: string;
          employeeName: string;
          attendanceDate: string;
          punchIn: string;
          punchOut: string;
          assignedMachine: string;
        }>;
      };

      if (!response.ok) {
        const detail = body.debug?.cause ? ` ${body.debug.cause}` : "";
        throw new Error((body.error ?? "Bulk attendance submission failed.") + detail);
      }

      result.imported = body.imported ?? 0;
      result.skipped += body.skipped ?? 0;
      if (body.provisionedEmployees && body.provisionedEmployees > 0) {
        result.createdEmployees += body.provisionedEmployees;
      }
      if (Array.isArray(body.errors)) {
        result.errors.push(...body.errors);
      }

      for (const record of body.records ?? []) {
        try {
          if (!record?.id || !record.employeeId) continue;
          ingestManualEntry({
            id: record.id,
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            attendanceDate: record.attendanceDate,
            punchIn: record.punchIn,
            punchOut: record.punchOut ?? "",
            remarks: record.assignedMachine ?? "",
            status: mappedStatusFromRecord(record),
            overtimeHours: safeBulkNumericFromRecord(record),
          });
        } catch (entryError) {
          console.error(entryError);
        }
      }

      setImportMessage(
        `Processed ${result.imported} attendance row(s)` +
          (result.createdEmployees > 0
            ? ` · New employees auto-created: ${result.createdEmployees}`
            : "") +
          (result.skipped > 0 ? ` · Skipped ${result.skipped}` : "") +
          "."
      );

      if (result.errors.length > 0) {
        setImportError(result.errors.slice(0, 3).join(" · "));
      }

      setImportPreview(null);
      setSelectedBulkRowIndex(0);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Bulk attendance processing failed.";
      setImportError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [employees, importPreview, ingestManualEntry, prependEmployee]);

  const handleBulkRowIndexChange = useCallback((index: number) => {
    try {
      if (index == null || !Number.isFinite(index) || index < 0) return;
      if (!importPreview?.bulkRows?.length) return;
      if (index >= importPreview.bulkRows.length) return;
      setSelectedBulkRowIndex(index);
    } catch (error) {
      console.error(error);
    }
  }, [importPreview?.bulkRows]);

  const handleBulkRowsChange = useCallback((nextRows: Biometric23ColumnRecord[]) => {
    try {
      if (!importPreview) return;
      if (!Array.isArray(nextRows)) return;

      const bulkRows = nextRows.map((row) =>
        normalizeBiometric23ColumnRecord(row, { defaultDate: importPreview.reportDate })
      );
      setImportPreview((current) => {
        if (!current) return current;
        return { ...current, bulkRows };
      });
    } catch (error) {
      console.error(error);
    }
  }, [importPreview]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 border-b border-corporate-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">Attendance Logging</h2>
            <p className="text-sm text-corporate-muted">
              Direct Excel import with auto employee provisioning, manual entry, and verification
              workflow
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-corporate-brand-light text-corporate-brand">
            <FileSpreadsheet className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-corporate-text">Bulk Import — Excel / PDF / CSV</h3>
            <p className="mt-1 text-xs text-corporate-muted">
              Upload the biometric Daily Performance export (.xls/.xlsx) with 22 Excel columns —
              the grid adds an explicit Date column (23 total). Srl No., Pay Code, Card No,
              Employee Name through Manual. Missing employee codes are auto-created when you
              process the import.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-corporate-border bg-corporate-bg px-4 py-8 text-center",
            (isParsing || isProcessing) && "opacity-70"
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-corporate-muted" aria-hidden />
          <p className="text-sm font-medium text-corporate-text">Select Excel, PDF, or CSV file</p>
          <p className="mt-1 text-xs text-corporate-muted">Supported: .xlsx, .xls, .pdf, .csv</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-corporate-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            <Upload className="h-4 w-4" aria-hidden />
            Choose File
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pdf,.csv"
              className="sr-only"
              disabled={isParsing || isProcessing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFileSelect(file);
              }}
            />
          </label>
        </div>

        {importPreview && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-3">
              <div>
                <p className="text-sm font-bold text-corporate-brand">
                  New Employees Auto-Detected &amp; Created: {importPreview.pendingNewEmployees.length}
                </p>
                <p className="text-xs text-corporate-muted">
                  Preview for {importPreview.fileName} — {importPreview.rows.length} attendance
                  row(s) ready to process
                </p>
              </div>
              <button
                type="button"
                onClick={() => void processBulkImport()}
                disabled={isProcessing}
                className="btn-primary inline-flex h-11 min-h-[44px] items-center gap-2 px-5 text-sm"
              >
                <Save className="h-4 w-4" aria-hidden />
                {isProcessing ? "Processing..." : "Process & Save Bulk Attendance"}
              </button>
            </div>

            {importPreview.pendingNewEmployees.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <p className="font-semibold">Pending auto-provision profiles</p>
                <p className="mt-1">
                  {importPreview.pendingNewEmployees
                    .map((row) => `${row.employeeCode} — ${row.employeeName}`)
                    .join(" · ")}
                </p>
              </div>
            )}

            {importPreview.alignmentInfo && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <p className="font-semibold">Column alignment</p>
                <p className="mt-1">{importPreview.alignmentInfo}</p>
              </div>
            )}

            {(importPreview.skippedRows > 0 || importPreview.warnings.length > 0) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                <p className="font-semibold">Import sanitization summary</p>
                <p className="mt-1">
                  {importPreview.skippedRows > 0
                    ? `${importPreview.skippedRows} malformed row(s) were safely skipped. `
                    : ""}
                  {importPreview.warnings.join(" ")}
                </p>
              </div>
            )}

            <AttendanceBulkImportPreviewGrid
              rows={importPreview.bulkRows}
              selectedRowIndex={selectedBulkRowIndex}
              onSelectedRowIndexChange={handleBulkRowIndexChange}
              onRowsChange={handleBulkRowsChange}
            />
            <p className="text-xs text-corporate-muted">
              Press Enter on a row to move focus to the next row. Use arrow keys or click to select
              rows in the 23-column preview.
            </p>
          </div>
        )}

        {importMessage && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {importMessage}
          </p>
        )}
        {importError && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {importError}
          </p>
        )}
      </section>

      <ManualAttendanceEntryPanel />

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-corporate-text">Verification Workflow</h3>
          <p className="text-xs text-corporate-muted">
            Four-stage attendance engine — allocation, operator verification, supervisor approval,
            payroll commit
          </p>
        </div>
        <AttendanceSystemPanel />
      </section>
    </div>
  );
}
