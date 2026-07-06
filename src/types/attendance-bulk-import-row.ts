import {
  BIOMETRIC_DAY_CODE,
  normalizeBiometricCode,
  type ManualAttendanceStatus,
  type OvertimeShiftType,
} from "@/types/manual-attendance-entry";

/** Grid column labels — 23 columns (date inserted after Shift). */
export const BIOMETRIC_GRID_HEADER_LABELS = [
  "Srl No.",
  "Pay Code",
  "Card No",
  "Employee Name",
  "Department",
  "Designation",
  "Shift",
  "Date",
  "Start",
  "In",
  "Lunch Out",
  "Lunch In",
  "Out",
  "Hours Worked",
  "Status",
  "Early Arrival",
  "Shift Late",
  "Shift Early",
  "Excess Lunch",
  "OT",
  "Overtime Amount",
  "Over Stay",
  "Manual",
] as const;

/** @deprecated Use BIOMETRIC_GRID_HEADER_LABELS */
export const BIOMETRIC_EXCEL_HEADER_LABELS = BIOMETRIC_GRID_HEADER_LABELS;

/** Stable flat 23-column biometric bulk import record — every key defaults to "". */
export type Biometric23ColumnRecord = {
  serialNumber: string;
  payCode: string;
  cardNumber: string;
  employeeName: string;
  department: string;
  designation: string;
  shift: string;
  date: string;
  start: string;
  in: string;
  lunchOut: string;
  lunchIn: string;
  out: string;
  hoursWorked: string;
  status: string;
  earlyArrival: string;
  shiftLate: string;
  shiftEarly: string;
  excessLunch: string;
  ot: string;
  overtimeAmount: string;
  overStay: string;
  manual: string;
};

/** @deprecated Use Biometric23ColumnRecord */
export type Biometric22ColumnRecord = Biometric23ColumnRecord;

/** @deprecated Use Biometric23ColumnRecord */
export type AttendanceBulkImportRecord = Biometric23ColumnRecord;

export const BIOMETRIC_23_COLUMN_KEYS: (keyof Biometric23ColumnRecord)[] = [
  "serialNumber",
  "payCode",
  "cardNumber",
  "employeeName",
  "department",
  "designation",
  "shift",
  "date",
  "start",
  "in",
  "lunchOut",
  "lunchIn",
  "out",
  "hoursWorked",
  "status",
  "earlyArrival",
  "shiftLate",
  "shiftEarly",
  "excessLunch",
  "ot",
  "overtimeAmount",
  "overStay",
  "manual",
];

/** @deprecated Use BIOMETRIC_23_COLUMN_KEYS */
export const BIOMETRIC_22_COLUMN_KEYS = BIOMETRIC_23_COLUMN_KEYS;

export const ATTENDANCE_BULK_IMPORT_COLUMN_COUNT = 23;

export const ATTENDANCE_BULK_IMPORT_COLUMNS: {
  key: keyof Biometric23ColumnRecord;
  label: string;
}[] = [
  { key: "serialNumber", label: BIOMETRIC_GRID_HEADER_LABELS[0] },
  { key: "payCode", label: BIOMETRIC_GRID_HEADER_LABELS[1] },
  { key: "cardNumber", label: BIOMETRIC_GRID_HEADER_LABELS[2] },
  { key: "employeeName", label: BIOMETRIC_GRID_HEADER_LABELS[3] },
  { key: "department", label: BIOMETRIC_GRID_HEADER_LABELS[4] },
  { key: "designation", label: BIOMETRIC_GRID_HEADER_LABELS[5] },
  { key: "shift", label: BIOMETRIC_GRID_HEADER_LABELS[6] },
  { key: "date", label: BIOMETRIC_GRID_HEADER_LABELS[7] },
  { key: "start", label: BIOMETRIC_GRID_HEADER_LABELS[8] },
  { key: "in", label: BIOMETRIC_GRID_HEADER_LABELS[9] },
  { key: "lunchOut", label: BIOMETRIC_GRID_HEADER_LABELS[10] },
  { key: "lunchIn", label: BIOMETRIC_GRID_HEADER_LABELS[11] },
  { key: "out", label: BIOMETRIC_GRID_HEADER_LABELS[12] },
  { key: "hoursWorked", label: BIOMETRIC_GRID_HEADER_LABELS[13] },
  { key: "status", label: BIOMETRIC_GRID_HEADER_LABELS[14] },
  { key: "earlyArrival", label: BIOMETRIC_GRID_HEADER_LABELS[15] },
  { key: "shiftLate", label: BIOMETRIC_GRID_HEADER_LABELS[16] },
  { key: "shiftEarly", label: BIOMETRIC_GRID_HEADER_LABELS[17] },
  { key: "excessLunch", label: BIOMETRIC_GRID_HEADER_LABELS[18] },
  { key: "ot", label: BIOMETRIC_GRID_HEADER_LABELS[19] },
  { key: "overtimeAmount", label: BIOMETRIC_GRID_HEADER_LABELS[20] },
  { key: "overStay", label: BIOMETRIC_GRID_HEADER_LABELS[21] },
  { key: "manual", label: BIOMETRIC_GRID_HEADER_LABELS[22] },
];

export const EMPTY_BIOMETRIC_23_COLUMN_RECORD: Biometric23ColumnRecord = {
  serialNumber: "",
  payCode: "",
  cardNumber: "",
  employeeName: "",
  department: "",
  designation: "",
  shift: "",
  date: "",
  start: "",
  in: "",
  lunchOut: "",
  lunchIn: "",
  out: "",
  hoursWorked: "",
  status: "",
  earlyArrival: "",
  shiftLate: "",
  shiftEarly: "",
  excessLunch: "",
  ot: "",
  overtimeAmount: "",
  overStay: "",
  manual: "",
};

/** @deprecated Use EMPTY_BIOMETRIC_23_COLUMN_RECORD */
export const EMPTY_BIOMETRIC_22_COLUMN_RECORD = EMPTY_BIOMETRIC_23_COLUMN_RECORD;

/** @deprecated Use EMPTY_BIOMETRIC_23_COLUMN_RECORD */
export const EMPTY_BULK_IMPORT_RECORD = EMPTY_BIOMETRIC_23_COLUMN_RECORD;

export function todayIsoDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeCell(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function normalizeBiometricField(value: unknown): string {
  try {
    const token = String(value ?? "")
      .trim()
      .toUpperCase();
    if (!token) return "";
    if (token.includes("G11")) return "G11";
    if (token.includes("DY1") || token.includes("DY")) return "DY1";
    return token;
  } catch {
    return "";
  }
}

function normalizeDateToken(value: unknown, fallback?: string): string {
  try {
    const token = safeCell(value);
    if (token) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;
      const slash = token.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
      if (slash) {
        const day = slash[1]!.padStart(2, "0");
        const month = slash[2]!.padStart(2, "0");
        let year = slash[3]!;
        if (year.length === 2) year = `20${year}`;
        return `${year}-${month}-${day}`;
      }
      const parsed = Date.parse(token);
      if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
    }
    return safeCell(fallback) || todayIsoDateString();
  } catch {
    return safeCell(fallback) || todayIsoDateString();
  }
}

/** Normalize any date token to ISO YYYY-MM-DD (DD/MM/YYYY safe). */
export function normalizeAttendanceDateIso(value: unknown, fallback?: string): string {
  return normalizeDateToken(value, fallback);
}

/** Inject today's date when the explicit date column is blank. */
export function applyDateFallback(
  record: Partial<Biometric23ColumnRecord> | null | undefined,
  fallbackDate?: string
): string {
  return normalizeDateToken(record?.date, fallbackDate);
}

/** Merge partial rows into a full 23-key record with "" defaults. */
export function normalizeBiometric23ColumnRecord(
  partial: Partial<Biometric23ColumnRecord> | Record<string, unknown> | null | undefined,
  options?: { defaultDate?: string }
): Biometric23ColumnRecord {
  try {
    const source = (partial ?? {}) as Record<string, unknown>;
    const legacyStartIn = safeCell(source.startIn);
    const legacyStart = safeCell(source.start ?? legacyStartIn);
    const legacyIn = safeCell(source.inTime ?? source.in ?? "");
    const legacyOvertimeAmount = safeCell(
      source.overtimeAmount ?? source.overtime ?? source["overtime amount"]
    );
    const legacyOverStay = safeCell(source.overStay ?? source.overstay ?? source["over stay"]);
    const legacyDate = normalizeDateToken(
      source.date ?? source.attendanceDate ?? source.attendance_date,
      options?.defaultDate
    );

    const merged: Biometric23ColumnRecord = {
      ...EMPTY_BIOMETRIC_23_COLUMN_RECORD,
      serialNumber: safeCell(source.serialNumber ?? source.srlNumber ?? source["srl no."]),
      payCode: safeCell(source.payCode),
      cardNumber: safeCell(source.cardNumber ?? source["card no"]),
      employeeName: safeCell(source.employeeName),
      department: safeCell(source.department),
      designation: safeCell(source.designation ?? source.designations),
      shift: safeCell(source.shift),
      date: legacyDate,
      start: legacyStart,
      in: legacyIn,
      lunchOut: safeCell(source.lunchOut),
      lunchIn: safeCell(source.lunchIn),
      out: safeCell(source.out ?? source.outTime),
      hoursWorked: safeCell(source.hoursWorked),
      status: safeCell(source.status),
      earlyArrival: safeCell(source.earlyArrival),
      shiftLate: safeCell(source.shiftLate),
      shiftEarly: safeCell(source.shiftEarly),
      excessLunch: safeCell(source.excessLunch),
      ot: safeCell(source.ot),
      overtimeAmount: legacyOvertimeAmount,
      overStay: legacyOverStay,
      manual: safeCell(source.manual),
    };

    const shift = normalizeBiometricField(merged.shift) || merged.shift;
    const status = safeCell(merged.status) || shift || BIOMETRIC_DAY_CODE;
    const ot = normalizeBiometricField(merged.ot) || merged.ot;

    return {
      ...merged,
      shift: shift || "",
      date: applyDateFallback(merged, options?.defaultDate),
      status: status || BIOMETRIC_DAY_CODE,
      ot: ot || "",
      overtimeAmount: merged.overtimeAmount || "",
      overStay: merged.overStay || "",
      manual: merged.manual || "",
    };
  } catch (error) {
    console.error(error);
    return {
      ...EMPTY_BIOMETRIC_23_COLUMN_RECORD,
      date: options?.defaultDate || todayIsoDateString(),
      status: BIOMETRIC_DAY_CODE,
    };
  }
}

/** @deprecated Use normalizeBiometric23ColumnRecord */
export function normalizeBiometric22ColumnRecord(
  partial: Partial<Biometric23ColumnRecord> | Record<string, unknown> | null | undefined,
  options?: { defaultDate?: string }
): Biometric23ColumnRecord {
  return normalizeBiometric23ColumnRecord(partial, options);
}

/** @deprecated Use normalizeBiometric23ColumnRecord */
export function finalizeBulkImportRecord(
  partial: Partial<Biometric23ColumnRecord> | Record<string, unknown> | null | undefined
): Biometric23ColumnRecord {
  return normalizeBiometric23ColumnRecord(partial);
}

/** Positional mapping — supports 23-col grid rows or 22-col Excel rows (date injected). */
export function bulkRecordFromCells(
  cells: unknown,
  defaultDate?: string
): Biometric23ColumnRecord {
  try {
    const row = Array.isArray(cells) ? cells : [];
    const cell = (index: number) => safeCell(row[index] ?? "");
    const dateFallback = normalizeDateToken(defaultDate);
    const is23ColGrid = row.length >= 23;

    if (is23ColGrid) {
      return normalizeBiometric23ColumnRecord(
        {
          serialNumber: cell(0),
          payCode: cell(1),
          cardNumber: cell(2),
          employeeName: cell(3),
          department: cell(4),
          designation: cell(5),
          shift: cell(6),
          date: cell(7),
          start: cell(8),
          in: cell(9),
          lunchOut: cell(10),
          lunchIn: cell(11),
          out: cell(12),
          hoursWorked: cell(13),
          status: cell(14),
          earlyArrival: cell(15),
          shiftLate: cell(16),
          shiftEarly: cell(17),
          excessLunch: cell(18),
          ot: cell(19),
          overtimeAmount: cell(20),
          overStay: cell(21),
          manual: cell(22),
        },
        { defaultDate: dateFallback }
      );
    }

    const excelRow = row.slice(0, 22);
    const excelCell = (index: number) => safeCell(excelRow[index] ?? "");

    return normalizeBiometric23ColumnRecord(
      {
        serialNumber: excelCell(0),
        payCode: excelCell(1),
        cardNumber: excelCell(2),
        employeeName: excelCell(3),
        department: excelCell(4),
        designation: excelCell(5),
        shift: excelCell(6),
        date: dateFallback,
        start: excelCell(7),
        in: excelCell(8),
        lunchOut: excelCell(9),
        lunchIn: excelCell(10),
        out: excelCell(11),
        hoursWorked: excelCell(12),
        status: excelCell(13),
        earlyArrival: excelCell(14),
        shiftLate: excelCell(15),
        shiftEarly: excelCell(16),
        excessLunch: excelCell(17),
        ot: excelCell(18),
        overtimeAmount: excelCell(19),
        overStay: excelCell(20),
        manual: excelCell(21),
      },
      { defaultDate: dateFallback }
    );
  } catch (error) {
    console.error(error);
    return normalizeBiometric23ColumnRecord(null, { defaultDate: defaultDate });
  }
}

export function bulkRecordHasContent(record: Biometric23ColumnRecord): boolean {
  try {
    const safe = normalizeBiometric23ColumnRecord(record);
    return ATTENDANCE_BULK_IMPORT_COLUMNS.some(
      (column) => safeCell(safe[column.key]).length > 0
    );
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function processBulkRowUpdate(
  id: string | null | undefined,
  oldRow: Biometric23ColumnRecord | null | undefined,
  newRow: Biometric23ColumnRecord | null | undefined
): Biometric23ColumnRecord {
  try {
    if (!newRow || !oldRow || !id) {
      return normalizeBiometric23ColumnRecord(oldRow);
    }
    return normalizeBiometric23ColumnRecord({ ...oldRow, ...newRow });
  } catch (error) {
    console.error(error);
    return normalizeBiometric23ColumnRecord(oldRow);
  }
}

export function bulkRecordToWorkflowFields(record: Biometric23ColumnRecord): {
  employeeCode: string;
  employeeName: string;
  status: ManualAttendanceStatus;
  overtimeShift: OvertimeShiftType;
  remarks: string;
} {
  try {
    const safe = normalizeBiometric23ColumnRecord(record);
    const employeeCode = safe.payCode || safe.cardNumber || "TEMP_CODE";
    const employeeName = safe.employeeName || "Unknown";
    const statusSource = safe.shift || safe.status || BIOMETRIC_DAY_CODE;
    const status = normalizeBiometricCode(statusSource);
    const otSource = safe.ot || safe.overtimeAmount || safe.overStay || "";
    const overtimeShift = otSource ? normalizeBiometricCode(otSource) : status;

    const remarks = [
      safe.date ? `Date: ${safe.date}` : "",
      safe.status ? `Attendance Status: ${safe.status}` : "",
      safe.department ? `Department: ${safe.department}` : "",
      safe.designation ? `Designation: ${safe.designation}` : "",
      safe.shift ? `Shift: ${safe.shift}` : "",
      safe.manual ? `Manual: ${safe.manual}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      employeeCode,
      employeeName,
      status,
      overtimeShift,
      remarks: remarks || `Bulk import row ${safe.serialNumber || "—"}`,
    };
  } catch (error) {
    console.error(error);
    return {
      employeeCode: "TEMP_CODE",
      employeeName: "Unknown",
      status: BIOMETRIC_DAY_CODE,
      overtimeShift: BIOMETRIC_DAY_CODE,
      remarks: "Recovered bulk import row.",
    };
  }
}
