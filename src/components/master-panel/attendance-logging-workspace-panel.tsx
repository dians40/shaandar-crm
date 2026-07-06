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
  buildImportAttendanceRemarks,
  buildImportPunchTimes,
  formatImportOvertimeShiftLabel,
  formatImportStatusLabel,
} from "@/lib/attendance-import-process";
import {
  parseAttendanceImportFileSafe,
  type AttendanceImportRow,
} from "@/lib/attendance-import-parser";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";
import AttendanceSystemPanel from "./attendance-system-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";

type ImportPreviewState = {
  fileName: string;
  rows: AttendanceImportRow[];
  pendingNewEmployees: PendingAutoEmployee[];
  skippedRows: number;
  warnings: string[];
};

type ImportResult = {
  imported: number;
  skipped: number;
  createdEmployees: number;
  errors: string[];
};

export default function AttendanceLoggingWorkspacePanel() {
  const { employees, prependEmployee } = useEmployees();
  const { ingestManualEntry } = useAttendanceWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const autoProvisioned = readAutoProvisionedEmployees();
  const mergedEmployees = [...autoProvisioned, ...employees];

  const handleFileSelect = async (file: File) => {
    setImportMessage(null);
    setImportError(null);
    setIsParsing(true);

    try {
      const { rows: parsedRows, skippedRows, warnings } =
        await parseAttendanceImportFileSafe(file);

      if (parsedRows.length === 0) {
        setImportPreview(null);
        setImportError(
          warnings.length > 0
            ? warnings.join(" ")
            : "No valid attendance rows found. Include Employee Code, Employee Name, Attendance Status, and Overtime Shift columns."
        );
        return;
      }

      const registry = readAutoProvisionedEmployees();
      const pendingNewEmployees = detectPendingAutoEmployees(
        parsedRows,
        employees,
        registry
      );

      setImportPreview({
        fileName: file.name,
        rows: parsedRows,
        pendingNewEmployees,
        skippedRows,
        warnings,
      });
    } catch (error) {
      setImportPreview(null);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to read the selected file. Check the Excel, PDF, or CSV structure and try again.";
      setImportError(message);
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

      for (const row of importPreview.rows) {
        const employeeCode =
          row.employeeCode.trim() ||
          `AUTO-${row.employeeName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)}`;

        let employee = resolveImportEmployee(
          employeeCode,
          row.employeeName,
          employees,
          registry
        );

        if (!employee) {
          const created = createAutoProvisionedEmployee(employeeCode, row.employeeName);
          registry = upsertAutoProvisionedEmployee(created);
          prependEmployee(created);
          employee = created;
          result.createdEmployees += 1;
        }

        const { punchIn, punchOut } = buildImportPunchTimes(row);
        const remarks = buildImportAttendanceRemarks(row, employee.name);

        const overtimeHours = row.overtimeShift ? 1 : 0;

        try {
          const response = await fetch("/api/v1/attendance/workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: employee.id,
              employeeName: employee.name,
              attendanceDate: row.attendanceDate,
              status: row.status,
              overtimeHours,
              overtimeShift: row.overtimeShift || undefined,
              remarks,
              punchIn,
              punchOut: punchOut || undefined,
            }),
          });

          if (!response.ok) {
            const body = (await response.json()) as { error?: string };
            throw new Error(body.error ?? "Failed to save attendance row.");
          }

          const body = (await response.json()) as { record?: { id: string } };
          const recordId =
            body.record?.id ??
            `att-import-${employee.id}-${row.attendanceDate}-${Date.now()}-${result.imported}`;

          ingestManualEntry({
            id: recordId,
            employeeId: employee.id,
            employeeName: employee.name,
            attendanceDate: row.attendanceDate,
            punchIn,
            punchOut,
            remarks,
            status: row.status,
            overtimeHours,
          });

          result.imported += 1;
        } catch (rowError) {
          result.skipped += 1;
          result.errors.push(
            rowError instanceof Error
              ? `${row.employeeName}: ${rowError.message}`
              : `${row.employeeName}: Import failed`
          );
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bulk attendance processing failed.";
      setImportError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [employees, importPreview, ingestManualEntry, prependEmployee]);

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
              Upload .xlsx, .xls, .pdf, or .csv with Employee Code, Employee Name, Attendance
              Status, and Overtime Shift. Missing employee codes are auto-created when you process
              the import.
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

            <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "max-h-[360px] overflow-auto")}>
              <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[960px]")}>
                <thead className={MASTER_LIST_HEAD_CLASS}>
                  <tr>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee Code</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee Name</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Attendance Status</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Overtime Shift</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                    <th className={MASTER_LIST_HEADER_CELL_CLASS}>Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corporate-border">
                  {importPreview.rows.map((row, index) => {
                    const employeeCode =
                      row.employeeCode.trim() ||
                      `AUTO-${row.employeeName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)}`;
                    const matched = resolveImportEmployee(
                      employeeCode,
                      row.employeeName,
                      mergedEmployees,
                      autoProvisioned
                    );
                    const isNew = importPreview.pendingNewEmployees.some(
                      (pending) => pending.employeeCode === employeeCode.toUpperCase()
                    );

                    return (
                      <tr key={`${employeeCode}-${row.attendanceDate}-${index}`}>
                        <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                          {employeeCode}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.employeeName}</td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>
                          {formatImportStatusLabel(row.status)}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>
                          {formatImportOvertimeShiftLabel(row.overtimeShift)}
                        </td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.attendanceDate}</td>
                        <td className={MASTER_LIST_BODY_CELL_CLASS}>
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-[10px] font-semibold",
                              isNew
                                ? "bg-amber-100 text-amber-900"
                                : matched
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-corporate-bg text-corporate-muted"
                            )}
                          >
                            {isNew ? "Auto-Create" : matched ? "Existing" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
