"use client";

import { useCallback, useRef, useState } from "react";
import { CalendarCheck, FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import type { ManualAttendanceStatus } from "@/types/manual-attendance-entry";
import AttendanceSystemPanel from "./attendance-system-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

const VALID_STATUSES = new Set<ManualAttendanceStatus>([
  "present",
  "absent",
  "half_day",
  "paid_leave",
]);

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAttendanceCsv(text: string): Array<{
  employeeName: string;
  attendanceDate: string;
  status: ManualAttendanceStatus;
  overtimeHours: number;
  remarks: string;
}> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const nameIndex = headerCells.findIndex((cell) =>
    ["employeename", "staffname", "name", "employee"].includes(cell)
  );
  const dateIndex = headerCells.findIndex((cell) =>
    ["attendancedate", "date", "workdate"].includes(cell)
  );
  const statusIndex = headerCells.findIndex((cell) => cell === "status");
  const otIndex = headerCells.findIndex((cell) =>
    ["overtimehours", "overtime", "othours"].includes(cell)
  );
  const remarksIndex = headerCells.findIndex((cell) =>
    ["remarks", "notes", "shiftinfo"].includes(cell)
  );

  const rows: Array<{
    employeeName: string;
    attendanceDate: string;
    status: ManualAttendanceStatus;
    overtimeHours: number;
    remarks: string;
  }> = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const employeeName = cells[nameIndex >= 0 ? nameIndex : 0]?.trim() ?? "";
    const attendanceDate = cells[dateIndex >= 0 ? dateIndex : 1]?.trim() ?? "";
    const statusRaw = (cells[statusIndex >= 0 ? statusIndex : 2]?.trim() ?? "present")
      .toLowerCase()
      .replace(/\s+/g, "_") as ManualAttendanceStatus;
    const status = VALID_STATUSES.has(statusRaw) ? statusRaw : "present";
    const overtimeHours = Number(cells[otIndex >= 0 ? otIndex : 3]) || 0;
    const remarks = cells[remarksIndex >= 0 ? remarksIndex : 4]?.trim() ?? "";

    if (!employeeName || !attendanceDate) continue;

    rows.push({ employeeName, attendanceDate, status, overtimeHours, remarks });
  }

  return rows;
}

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

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportError(
        "Excel (.xlsx) files must be saved as CSV before import. Please export to CSV and retry."
      );
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const parsedRows = parseAttendanceCsv(text);

      if (parsedRows.length === 0) {
        setImportError("No valid attendance rows found in the file.");
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
        `Imported ${result.imported} row(s)` +
          (result.skipped > 0 ? ` · Skipped ${result.skipped}` : "") +
          "."
      );

      if (result.errors.length > 0) {
        setImportError(result.errors.slice(0, 3).join(" · "));
      }
    } catch {
      setImportError("Unable to read the selected file. Check the CSV format and try again.");
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
              Bulk CSV import, manual entry, and the four-stage verification workflow
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
            <h3 className="text-sm font-bold text-corporate-text">Bulk Import — CSV / Excel</h3>
            <p className="mt-1 text-xs text-corporate-muted">
              Upload a CSV file with columns: Employee Name, Date, Status, Overtime Hours,
              Remarks. Save Excel sheets as CSV before uploading.
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
          <p className="text-sm font-medium text-corporate-text">Select CSV or Excel export file</p>
          <p className="mt-1 text-xs text-corporate-muted">
            Supported: .csv (Excel files — save as CSV first)
          </p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-corporate-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            <Upload className="h-4 w-4" aria-hidden />
            Choose File
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
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
