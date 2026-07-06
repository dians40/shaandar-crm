"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_BULK_IMPORT_COLUMNS,
  normalizeAttendanceDateIso,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type BiometricLogRow = Biometric23ColumnRecord & {
  id: string;
};

const API_KEY_TO_RECORD: Record<keyof Biometric23ColumnRecord, keyof BiometricLogRow> = {
  serialNumber: "serialNumber",
  payCode: "payCode",
  cardNumber: "cardNumber",
  employeeName: "employeeName",
  department: "department",
  designation: "designation",
  shift: "shift",
  date: "date",
  start: "start",
  in: "in",
  lunchOut: "lunchOut",
  lunchIn: "lunchIn",
  out: "out",
  hoursWorked: "hoursWorked",
  status: "status",
  earlyArrival: "earlyArrival",
  shiftLate: "shiftLate",
  shiftEarly: "shiftEarly",
  excessLunch: "excessLunch",
  ot: "ot",
  overtimeAmount: "overtimeAmount",
  overStay: "overStay",
  manual: "manual",
};

function mapApiRow(raw: Record<string, unknown>): BiometricLogRow {
  return {
    id: String(raw.id ?? ""),
    serialNumber: String(raw.srlNumber ?? raw.srl_number ?? ""),
    payCode: String(raw.payCode ?? raw.pay_code ?? ""),
    cardNumber: String(raw.cardNumber ?? raw.card_number ?? ""),
    employeeName: String(raw.employeeName ?? raw.employee_name ?? ""),
    department: String(raw.department ?? ""),
    designation: String(raw.designation ?? ""),
    shift: String(raw.shift ?? ""),
    date: String(raw.date ?? raw.attendanceDate ?? raw.attendance_date ?? ""),
    start: String(raw.start ?? ""),
    in: String(raw.inTime ?? raw.in_time ?? ""),
    lunchOut: String(raw.lunchOut ?? raw.lunch_out ?? ""),
    lunchIn: String(raw.lunchIn ?? raw.lunch_in ?? ""),
    out: String(raw.outTime ?? raw.out_time ?? ""),
    hoursWorked: String(raw.hoursWorked ?? raw.hours_worked ?? ""),
    status: String(raw.status ?? ""),
    earlyArrival: String(raw.earlyArrival ?? raw.early_arrival ?? ""),
    shiftLate: String(raw.shiftLate ?? raw.shift_late ?? ""),
    shiftEarly: String(raw.shiftEarly ?? raw.shift_early ?? ""),
    excessLunch: String(raw.excessLunch ?? raw.excess_lunch ?? ""),
    ot: String(raw.ot ?? ""),
    overtimeAmount: String(raw.overtime ?? ""),
    overStay: String(raw.overstay ?? ""),
    manual: String(raw.manual ?? ""),
  };
}

export default function BiometricAttendanceRecordsPanel() {
  const [rows, setRows] = useState<BiometricLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (filterDate.trim()) {
        params.set("date", normalizeAttendanceDateIso(filterDate.trim()));
      }
      const response = await fetch(`/api/v1/attendance/biometric?${params.toString()}`);
      const body = (await response.json()) as {
        rows?: Record<string, unknown>[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load biometric attendance records.");
      }
      setRows(Array.isArray(body.rows) ? body.rows.map(mapApiRow) : []);
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load biometric attendance records."
      );
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-corporate-border pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              Biometric Attendance Log
            </h2>
            <p className="text-sm text-corporate-muted">
              Saved Daily Performance records with all 23 independent database columns
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-corporate-muted">
            Filter by Date
            <input
              type="date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="h-10 rounded-lg border border-corporate-border bg-white px-3 text-sm text-corporate-text"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadRows()}
            disabled={isLoading}
            className="btn-secondary inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      )}

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "max-h-[520px] overflow-auto")}>
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[2400px]")}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              {ATTENDANCE_BULK_IMPORT_COLUMNS.map((column) => (
                <th key={column.key} className={MASTER_LIST_HEADER_CELL_CLASS}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {isLoading ? (
              <tr>
                <td
                  colSpan={ATTENDANCE_BULK_IMPORT_COLUMNS.length}
                  className="px-3 py-8 text-center text-corporate-muted"
                >
                  Loading biometric attendance records...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={ATTENDANCE_BULK_IMPORT_COLUMNS.length}
                  className="px-3 py-8 text-center text-corporate-muted"
                >
                  No biometric attendance records saved yet. Import an Excel file from Transactions
                  → Attendance.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id || `${row.payCode}-${row.date}`}>
                  {ATTENDANCE_BULK_IMPORT_COLUMNS.map((column) => {
                    const key = API_KEY_TO_RECORD[column.key];
                    const value = row[key] ?? "";
                    return (
                      <td
                        key={`${row.id}-${column.key}`}
                        className={cn(
                          MASTER_LIST_BODY_CELL_CLASS,
                          "whitespace-nowrap text-xs",
                          (column.key === "shift" ||
                            column.key === "status" ||
                            column.key === "ot") &&
                            "font-semibold text-corporate-brand"
                        )}
                      >
                        {value || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
