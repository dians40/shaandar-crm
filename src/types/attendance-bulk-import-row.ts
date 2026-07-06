import {
  BIOMETRIC_DAY_CODE,
  normalizeBiometricCode,
  type ManualAttendanceStatus,
  type OvertimeShiftType,
} from "@/types/manual-attendance-entry";

/** Exact biometric column labels from 06-07-2026.xls (row index 5). */
export const BIOMETRIC_EXCEL_HEADER_LABELS = [
  "Srl No.",
  "Pay Code",
  "Card No",
  "Employee Name",
  "Department",
  "Designation",
  "Shift",
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

/** Stable flat 22-column biometric bulk import record — every key defaults to "". */
export type Biometric22ColumnRecord = {
  serialNumber: string;
  payCode: string;
  cardNumber: string;
  employeeName: string;
  department: string;
  designation: string;
  shift: string;
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

/** @deprecated Use Biometric22ColumnRecord */
export type AttendanceBulkImportRecord = Biometric22ColumnRecord;

export const BIOMETRIC_22_COLUMN_KEYS: (keyof Biometric22ColumnRecord)[] = [
  "serialNumber",
  "payCode",
  "cardNumber",
  "employeeName",
  "department",
  "designation",
  "shift",
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

export const ATTENDANCE_BULK_IMPORT_COLUMN_COUNT = 22;

export const ATTENDANCE_BULK_IMPORT_COLUMNS: {
  key: keyof Biometric22ColumnRecord;
  label: string;
}[] = [
  { key: "serialNumber", label: BIOMETRIC_EXCEL_HEADER_LABELS[0] },
  { key: "payCode", label: BIOMETRIC_EXCEL_HEADER_LABELS[1] },
  { key: "cardNumber", label: BIOMETRIC_EXCEL_HEADER_LABELS[2] },
  { key: "employeeName", label: BIOMETRIC_EXCEL_HEADER_LABELS[3] },
  { key: "department", label: BIOMETRIC_EXCEL_HEADER_LABELS[4] },
  { key: "designation", label: BIOMETRIC_EXCEL_HEADER_LABELS[5] },
  { key: "shift", label: BIOMETRIC_EXCEL_HEADER_LABELS[6] },
  { key: "start", label: BIOMETRIC_EXCEL_HEADER_LABELS[7] },
  { key: "in", label: BIOMETRIC_EXCEL_HEADER_LABELS[8] },
  { key: "lunchOut", label: BIOMETRIC_EXCEL_HEADER_LABELS[9] },
  { key: "lunchIn", label: BIOMETRIC_EXCEL_HEADER_LABELS[10] },
  { key: "out", label: BIOMETRIC_EXCEL_HEADER_LABELS[11] },
  { key: "hoursWorked", label: BIOMETRIC_EXCEL_HEADER_LABELS[12] },
  { key: "status", label: BIOMETRIC_EXCEL_HEADER_LABELS[13] },
  { key: "earlyArrival", label: BIOMETRIC_EXCEL_HEADER_LABELS[14] },
  { key: "shiftLate", label: BIOMETRIC_EXCEL_HEADER_LABELS[15] },
  { key: "shiftEarly", label: BIOMETRIC_EXCEL_HEADER_LABELS[16] },
  { key: "excessLunch", label: BIOMETRIC_EXCEL_HEADER_LABELS[17] },
  { key: "ot", label: BIOMETRIC_EXCEL_HEADER_LABELS[18] },
  { key: "overtimeAmount", label: BIOMETRIC_EXCEL_HEADER_LABELS[19] },
  { key: "overStay", label: BIOMETRIC_EXCEL_HEADER_LABELS[20] },
  { key: "manual", label: BIOMETRIC_EXCEL_HEADER_LABELS[21] },
];

export const EMPTY_BIOMETRIC_22_COLUMN_RECORD: Biometric22ColumnRecord = {
  serialNumber: "",
  payCode: "",
  cardNumber: "",
  employeeName: "",
  department: "",
  designation: "",
  shift: "",
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

/** @deprecated Use EMPTY_BIOMETRIC_22_COLUMN_RECORD */
export const EMPTY_BULK_IMPORT_RECORD = EMPTY_BIOMETRIC_22_COLUMN_RECORD;

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

/** Merge partial / legacy rows into a full 22-key record with "" defaults. */
export function normalizeBiometric22ColumnRecord(
  partial: Partial<Biometric22ColumnRecord> | Record<string, unknown> | null | undefined
): Biometric22ColumnRecord {
  try {
    const source = (partial ?? {}) as Record<string, unknown>;
    const legacyStartIn = safeCell(source.startIn);
    const legacyStart = safeCell(source.start ?? legacyStartIn);
    const legacyIn = safeCell(source.inTime ?? source.in ?? "");
    const legacyOvertimeAmount = safeCell(
      source.overtimeAmount ?? source.overtime ?? source["overtime amount"]
    );
    const legacyOverStay = safeCell(source.overStay ?? source.overstay ?? source["over stay"]);

    const merged: Biometric22ColumnRecord = {
      ...EMPTY_BIOMETRIC_22_COLUMN_RECORD,
      serialNumber: safeCell(source.serialNumber ?? source.srlNumber ?? source["srl no."]),
      payCode: safeCell(source.payCode),
      cardNumber: safeCell(source.cardNumber ?? source["card no"]),
      employeeName: safeCell(source.employeeName),
      department: safeCell(source.department),
      designation: safeCell(source.designation ?? source.designations),
      shift: safeCell(source.shift),
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
      status: status || BIOMETRIC_DAY_CODE,
      ot: ot || "",
    };
  } catch (error) {
    console.error(error);
    return { ...EMPTY_BIOMETRIC_22_COLUMN_RECORD, status: BIOMETRIC_DAY_CODE };
  }
}

/** @deprecated Use normalizeBiometric22ColumnRecord */
export function finalizeBulkImportRecord(
  partial: Partial<Biometric22ColumnRecord> | Record<string, unknown> | null | undefined
): Biometric22ColumnRecord {
  return normalizeBiometric22ColumnRecord(partial);
}

/** Positional mapping for the first 22 columns — ignores trailing hash / empty columns. */
export function bulkRecordFromCells(cells: unknown): Biometric22ColumnRecord {
  try {
    const row = Array.isArray(cells) ? cells.slice(0, ATTENDANCE_BULK_IMPORT_COLUMN_COUNT) : [];
    const cell = (index: number) => safeCell(row[index] ?? "");

    return normalizeBiometric22ColumnRecord({
      serialNumber: cell(0),
      payCode: cell(1),
      cardNumber: cell(2),
      employeeName: cell(3),
      department: cell(4),
      designation: cell(5),
      shift: cell(6),
      start: cell(7),
      in: cell(8),
      lunchOut: cell(9),
      lunchIn: cell(10),
      out: cell(11),
      hoursWorked: cell(12),
      status: cell(13),
      earlyArrival: cell(14),
      shiftLate: cell(15),
      shiftEarly: cell(16),
      excessLunch: cell(17),
      ot: cell(18),
      overtimeAmount: cell(19),
      overStay: cell(20),
      manual: cell(21),
    });
  } catch (error) {
    console.error(error);
    return normalizeBiometric22ColumnRecord(null);
  }
}

export function bulkRecordHasContent(record: Biometric22ColumnRecord): boolean {
  try {
    const safe = normalizeBiometric22ColumnRecord(record);
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
  oldRow: Biometric22ColumnRecord | null | undefined,
  newRow: Biometric22ColumnRecord | null | undefined
): Biometric22ColumnRecord {
  try {
    if (!newRow || !oldRow || !id) {
      return normalizeBiometric22ColumnRecord(oldRow);
    }
    return normalizeBiometric22ColumnRecord({ ...oldRow, ...newRow });
  } catch (error) {
    console.error(error);
    return normalizeBiometric22ColumnRecord(oldRow);
  }
}

export function bulkRecordToWorkflowFields(record: Biometric22ColumnRecord): {
  employeeCode: string;
  employeeName: string;
  status: ManualAttendanceStatus;
  overtimeShift: OvertimeShiftType;
  remarks: string;
} {
  try {
    const safe = normalizeBiometric22ColumnRecord(record);
    const employeeCode = safe.payCode || safe.cardNumber || "TEMP_CODE";
    const employeeName = safe.employeeName || "Unknown";
    const statusSource = safe.shift || safe.status || BIOMETRIC_DAY_CODE;
    const status = normalizeBiometricCode(statusSource);
    const otSource = safe.ot || safe.overtimeAmount || safe.overStay || "";
    const overtimeShift = otSource ? normalizeBiometricCode(otSource) : status;

    const remarks = [
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
