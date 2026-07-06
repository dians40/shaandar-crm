import {
  BIOMETRIC_DAY_CODE,
  normalizeBiometricCode,
  type ManualAttendanceStatus,
  type OvertimeShiftType,
} from "@/types/manual-attendance-entry";

/** Stable flat 22-column biometric bulk import record — every key defaults to "". */
export type Biometric22ColumnRecord = {
  serialNumber: string;
  payCode: string;
  cardNumber: string;
  employeeName: string;
  department: string;
  designation: string;
  shift: string;
  startIn: string;
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
  overtime: string;
  overstay: string;
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
  "startIn",
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
  "overtime",
  "overstay",
  "manual",
];

export const ATTENDANCE_BULK_IMPORT_COLUMN_COUNT = 22;

export const ATTENDANCE_BULK_IMPORT_COLUMNS: {
  key: keyof Biometric22ColumnRecord;
  label: string;
}[] = [
  { key: "serialNumber", label: "Serial Number" },
  { key: "payCode", label: "Pay Code" },
  { key: "cardNumber", label: "Card Number" },
  { key: "employeeName", label: "Employee Name" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "shift", label: "Shift" },
  { key: "startIn", label: "Start In" },
  { key: "lunchOut", label: "Lunch Out" },
  { key: "lunchIn", label: "Lunch In" },
  { key: "out", label: "Out" },
  { key: "hoursWorked", label: "Hours Worked" },
  { key: "status", label: "Status" },
  { key: "earlyArrival", label: "Early Arrival" },
  { key: "shiftLate", label: "Shift Late" },
  { key: "shiftEarly", label: "Shift Early" },
  { key: "excessLunch", label: "Excess Lunch" },
  { key: "ot", label: "OT" },
  { key: "overtime", label: "Overtime" },
  { key: "overstay", label: "Overstay" },
  { key: "manual", label: "Manual" },
];

export const EMPTY_BIOMETRIC_22_COLUMN_RECORD: Biometric22ColumnRecord = {
  serialNumber: "",
  payCode: "",
  cardNumber: "",
  employeeName: "",
  department: "",
  designation: "",
  shift: "",
  startIn: "",
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
  overtime: "",
  overstay: "",
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
    const legacyStart = safeCell(source.start ?? source.startIn);
    const legacyIn = safeCell(source.inTime ?? source.in);
    const startIn =
      safeCell(source.startIn) ||
      [legacyStart, legacyIn].filter(Boolean).join(" ").trim();

    const merged: Biometric22ColumnRecord = {
      ...EMPTY_BIOMETRIC_22_COLUMN_RECORD,
      serialNumber: safeCell(source.serialNumber ?? source.srlNumber),
      payCode: safeCell(source.payCode),
      cardNumber: safeCell(source.cardNumber),
      employeeName: safeCell(source.employeeName),
      department: safeCell(source.department),
      designation: safeCell(source.designation ?? source.designations),
      shift: safeCell(source.shift),
      startIn,
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
      overtime: safeCell(source.overtime),
      overstay: safeCell(source.overstay),
      manual: safeCell(source.manual),
    };

    const shift = normalizeBiometricField(merged.shift) || merged.shift;
    const status =
      normalizeBiometricField(merged.status) || merged.status || shift || BIOMETRIC_DAY_CODE;
    const ot = normalizeBiometricField(merged.ot) || merged.ot;
    const overtime = normalizeBiometricField(merged.overtime) || merged.overtime;

    return {
      ...merged,
      shift: shift || "",
      status: status || BIOMETRIC_DAY_CODE,
      ot: ot || "",
      overtime: overtime || "",
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

export function bulkRecordFromCells(cells: unknown): Biometric22ColumnRecord {
  try {
    const row = Array.isArray(cells) ? cells : [];
    const cell = (index: number) => safeCell(row[index] ?? "");
    const startRaw = cell(7);
    const inRaw = cell(8);
    const startIn = [startRaw, inRaw].filter(Boolean).join(" ").trim() || startRaw || inRaw;

    return normalizeBiometric22ColumnRecord({
      serialNumber: cell(0),
      payCode: cell(1),
      cardNumber: cell(2),
      employeeName: cell(3),
      department: cell(4),
      designation: cell(5),
      shift: cell(6),
      startIn,
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
      overtime: cell(19),
      overstay: cell(20),
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
    const statusSource = safe.status || safe.shift || BIOMETRIC_DAY_CODE;
    const status = normalizeBiometricCode(statusSource);
    const otSource = safe.ot || safe.overtime || safe.overstay || "";
    const overtimeShift = otSource ? normalizeBiometricCode(otSource) : status;

    const remarks = [
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
