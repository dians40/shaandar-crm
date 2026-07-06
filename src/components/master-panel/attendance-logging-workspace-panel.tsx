"use client";

import { useCallback, useRef, useState } from "react";
import { CalendarCheck, FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseAttendanceImportFile } from "@/lib/attendance-import-parser";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import AttendanceSystemPanel from "./attendance-system-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export default function AttendanceLoggingWorkspacePanel() {
  const { employees } = useEmployees();
  const { ingestManualEntry } = useAttendanceWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const resolveEmployee = useCallback(
    (name: string) =>
      employees.find(
        (employee) => employee.name.toLowerCase() === name.toLowerCase()
      ) ??
      employees.find((employee) =>
        employee.name.toLowerCase().includes(name.toLowerCase())
      ),
    [employees]
  );

  const handleFileImport = async (file: File) => {
    setImportMessage(null);
    setImportError(null);
    setIsImporting(true);

    try {
      const parsedRows = await parseAttendanceImportFile(file);

      if (parsedRows.length === 0) {
        setImportError(
          "No valid attendance rows found. Check column headers: Employee Name, Date, Status, Overtime Hours, Remarks."
        );
        return;
      }

      const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

      for (const row of parsedRows) {
        const employee = resolveEmployee(row.employeeName);
        if (!employee) {
          result.skipped += 1;
          result.errors.push(`Employee not found: ${row.employeeName}`);
          continue;
        }

        const date = row.attendanceDate;
        const punchIn =
          row.status === "absent" || row.status === "paid_leave"
            ? `${date}T00:00:00.000Z`
            : `${date}T09:00:00.000Z`;
        const punchOut =
          row.status === "absent" || row.status === "paid_leave"
            ? ""
            : row.status === "half_day"
              ? `${date}T13:00:00.000Z`
              : `${date}T18:00:00.000Z`;

        ingestManualEntry({
          id: `att-import-${employee.id}-${date}-${Date.now()}-${result.imported}`,
          employeeId: employee.id,
          employeeName: employee.name,
          attendanceDate: date,
          punchIn,
          punchOut,
          remarks: row.remarks,
          status: row.status,
          overtimeHours: row.overtimeHours,
        });

        result.imported += 1;
      }

      setImportMessage(
        `Imported ${result.imported} row(s) from ${file.name}` +
          (result.skipped > 0 ? ` · Skipped ${result.skipped}` : "") +
          "."
      );

      if (result.errors.length > 0) {
        setImportError(result.errors.slice(0, 3).join(" · "));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to read the selected file. Check the Excel or CSV structure and try again.";
      setImportError(message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 border-b border-corporate-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">Attendance Logging</h2>
            <p className="text-sm text-corporate-muted">
              Direct Excel import, manual entry, and the four-stage verification workflow
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
            <h3 className="text-sm font-bold text-corporate-text">Bulk Import — Excel / CSV</h3>
            <p className="mt-1 text-xs text-corporate-muted">
              Upload .xlsx, .xls, or .csv files with columns: Employee Name, Date, Status,
              Overtime Hours, Remarks. Excel workbooks are parsed directly — no manual CSV
              conversion required.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-corporate-border bg-corporate-bg px-4 py-8 text-center",
            isImporting && "opacity-70"
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-corporate-muted" aria-hidden />
          <p className="text-sm font-medium text-corporate-text">Select Excel or CSV file</p>
          <p className="mt-1 text-xs text-corporate-muted">Supported: .xlsx, .xls, .csv</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-corporate-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            <Upload className="h-4 w-4" aria-hidden />
            Choose File
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              disabled={isImporting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFileImport(file);
              }}
            />
          </label>
        </div>

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
