import {
  BIOMETRIC_DAY_CODE,
  normalizeBiometricCode,
  type ManualAttendanceStatus,
  type OvertimeShiftType,
} from "@/types/manual-attendance-entry";

/** Exact 22-column biometric bulk import flat record. */
export type AttendanceBulkImportRecord = {
  srlNumber: string;
  payCode: string;
  cardNumber: string;
  employeeName: string;
  department: string;
  designations: string;
  shift: string;
  start: string;
  inTime: string;
  lunchOut: string;
  lunchIn: string;
  outTime: string;
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

export const ATTENDANCE_BULK_IMPORT_COLUMN_COUNT = 22;

export const ATTENDANCE_BULK_IMPORT_COLUMNS: {
  key: keyof AttendanceBulkImportRecord;
  label: string;
}[] = [
  { key: "srlNumber", label: "SRL Number" },
  { key: "payCode", label: "Pay Code" },
  { key: "cardNumber", label: "Card Number" },
  { key: "employeeName", label: "Employee Name" },
  { key: "department", label: "Department" },
  { key: "designations", label: "Designations" },
  { key: "shift", label: "Shift" },
  { key: "start", label: "Start" },
  { key: "inTime", label: "In" },
  { key: "lunchOut", label: "Lunch Out" },
  { key: "lunchIn", label: "Lunch In" },
  { key: "outTime", label: "Out" },
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

export const EMPTY_BULK_IMPORT_RECORD: AttendanceBulkImportRecord = {
  srlNumber: "",
  payCode: "",
  cardNumber: "",
  employeeName: "",
  department: "",
  designations: "",
  shift: "",
  start: "",
  inTime: "",
  lunchOut: "",
  lunchIn: "",
  outTime: "",
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

export function finalizeBulkImportRecord(
  partial: Partial<AttendanceBulkImportRecord> | null | undefined
): AttendanceBulkImportRecord {
  try {
    const base = { ...EMPTY_BULK_IMPORT_RECORD, ...(partial ?? {}) };
    const shift = normalizeBiometricField(base.shift) || base.shift;
    const status = normalizeBiometricField(base.status) || base.status || shift;
    const ot = normalizeBiometricField(base.ot) || base.ot;
    const overtime = normalizeBiometricField(base.overtime) || base.overtime;

    return {
      srlNumber: safeCell(base.srlNumber),
      payCode: safeCell(base.payCode),
      cardNumber: safeCell(base.cardNumber),
      employeeName: safeCell(base.employeeName),
      department: safeCell(base.department),
      designations: safeCell(base.designations),
      shift: shift || "",
      start: safeCell(base.start),
      inTime: safeCell(base.inTime),
      lunchOut: safeCell(base.lunchOut),
      lunchIn: safeCell(base.lunchIn),
      outTime: safeCell(base.outTime),
      hoursWorked: safeCell(base.hoursWorked),
      status: status || BIOMETRIC_DAY_CODE,
      earlyArrival: safeCell(base.earlyArrival),
      shiftLate: safeCell(base.shiftLate),
      shiftEarly: safeCell(base.shiftEarly),
      excessLunch: safeCell(base.excessLunch),
      ot: ot || "",
      overtime: overtime || "",
      overstay: safeCell(base.overstay),
      manual: safeCell(base.manual),
    };
  } catch {
    return { ...EMPTY_BULK_IMPORT_RECORD, status: BIOMETRIC_DAY_CODE };
  }
}

export function bulkRecordFromCells(cells: unknown): AttendanceBulkImportRecord {
  try {
    const row = Array.isArray(cells) ? cells : [];
    const cell = (index: number) => safeCell(row[index] ?? "");

    return finalizeBulkImportRecord({
      srlNumber: cell(0),
      payCode: cell(1),
      cardNumber: cell(2),
      employeeName: cell(3),
      department: cell(4),
      designations: cell(5),
      shift: cell(6),
      start: cell(7),
      inTime: cell(8),
      lunchOut: cell(9),
      lunchIn: cell(10),
      outTime: cell(11),
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
  } catch {
    return finalizeBulkImportRecord(null);
  }
}

export function bulkRecordHasContent(record: AttendanceBulkImportRecord): boolean {
  try {
    return ATTENDANCE_BULK_IMPORT_COLUMNS.some(
      (column) => safeCell(record[column.key]).length > 0
    );
  } catch {
    return false;
  }
}

export function bulkRecordToWorkflowFields(record: AttendanceBulkImportRecord): {
  employeeCode: string;
  employeeName: string;
  status: ManualAttendanceStatus;
  overtimeShift: OvertimeShiftType;
  remarks: string;
} {
  try {
    const safe = finalizeBulkImportRecord(record);
    const employeeCode = safe.payCode || safe.cardNumber || "TEMP_CODE";
    const employeeName = safe.employeeName || "Unknown";
    const statusSource = safe.status || safe.shift || BIOMETRIC_DAY_CODE;
    const status = normalizeBiometricCode(statusSource);
    const otSource = safe.ot || safe.overtime || safe.overstay || "";
    const overtimeShift = otSource ? normalizeBiometricCode(otSource) : status;

    const remarks = [
      safe.department ? `Department: ${safe.department}` : "",
      safe.designations ? `Designation: ${safe.designations}` : "",
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
      remarks: remarks || `Bulk import row ${safe.srlNumber || "—"}`,
    };
  } catch {
    return {
      employeeCode: "TEMP_CODE",
      employeeName: "Unknown",
      status: BIOMETRIC_DAY_CODE,
      overtimeShift: BIOMETRIC_DAY_CODE,
      remarks: "Recovered bulk import row.",
    };
  }
}
