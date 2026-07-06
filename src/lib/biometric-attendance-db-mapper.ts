import type { Prisma } from "@prisma/client";
import type { AttendanceBulkDbPayload } from "@/lib/attendance-bulk-payload-bridge";
import { sanitizeBulkRowInput } from "@/lib/attendance-bulk-payload-bridge";
import {
  normalizeBiometric22ColumnRecord,
  type Biometric22ColumnRecord,
} from "@/types/attendance-bulk-import-row";

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function safeNumericString(value: unknown): string {
  try {
    const token = safeString(value).replace(/[$,]/g, "");
    if (!token) return "";
    const parsed = Number(token);
    return Number.isFinite(parsed) ? String(parsed) : safeString(value);
  } catch {
    return "";
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAttendanceDate(value: unknown): Date {
  try {
    const token = safeString(value);
    if (!token) return new Date(`${todayIsoDate()}T00:00:00.000Z`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
      return new Date(`${token}T00:00:00.000Z`);
    }
    const parsed = Date.parse(token);
    if (!Number.isNaN(parsed)) return new Date(parsed);
    return new Date(`${todayIsoDate()}T00:00:00.000Z`);
  } catch {
    return new Date(`${todayIsoDate()}T00:00:00.000Z`);
  }
}

function emptyBiometricCreateInput(
  employeeId: string | null | undefined
): Prisma.BiometricAttendanceCreateManyInput {
  return {
    employeeId: safeString(employeeId) || null,
    attendanceDate: new Date(`${todayIsoDate()}T00:00:00.000Z`),
    srlNumber: "",
    payCode: "",
    cardNumber: "",
    employeeName: "",
    department: "",
    designation: "",
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
    punchIn: `${todayIsoDate()}T09:00:00.000Z`,
    punchOut: "",
    remarks: "",
  };
}

function toBiometricRecord(
  row: AttendanceBulkDbPayload | Biometric22ColumnRecord | Record<string, unknown>
): Biometric22ColumnRecord {
  if ("serialNumber" in row && typeof row.serialNumber === "string") {
    return normalizeBiometric22ColumnRecord(row as Biometric22ColumnRecord);
  }
  if ("srl_number" in row) {
    return sanitizeBulkRowInput(row as Record<string, unknown>);
  }
  return normalizeBiometric22ColumnRecord(row as Record<string, unknown>);
}

/** Map preview grid / API payload into Prisma BiometricAttendance create input (22 columns). */
export function mapToBiometricAttendanceCreate(
  row: AttendanceBulkDbPayload | Biometric22ColumnRecord | Record<string, unknown>,
  employeeId: string | null | undefined
): Prisma.BiometricAttendanceCreateManyInput {
  try {
    const biometric = toBiometricRecord(row);
    const payload =
      "srl_number" in row && typeof (row as AttendanceBulkDbPayload).srl_number === "string"
        ? (row as AttendanceBulkDbPayload)
        : null;

    const attendanceDate = parseAttendanceDate(payload?.attendance_date);

    return {
      employeeId: safeString(employeeId) || null,
      attendanceDate,
      srlNumber: safeString(biometric.serialNumber),
      payCode: safeString(biometric.payCode),
      cardNumber: safeString(biometric.cardNumber),
      employeeName: safeString(biometric.employeeName),
      department: safeString(biometric.department),
      designation: safeString(biometric.designation),
      shift: safeString(biometric.shift),
      start: safeString(biometric.start),
      inTime: safeString(biometric.in),
      lunchOut: safeString(biometric.lunchOut),
      lunchIn: safeString(biometric.lunchIn),
      outTime: safeString(biometric.out),
      hoursWorked: safeString(biometric.hoursWorked),
      status: safeString(biometric.status),
      earlyArrival: safeNumericString(biometric.earlyArrival),
      shiftLate: safeNumericString(biometric.shiftLate),
      shiftEarly: safeNumericString(biometric.shiftEarly),
      excessLunch: safeNumericString(biometric.excessLunch),
      ot: safeNumericString(biometric.ot),
      overtime: safeNumericString(biometric.overtimeAmount),
      overstay: safeNumericString(biometric.overStay),
      manual: safeNumericString(biometric.manual),
      punchIn:
        safeString(payload?.punch_in) ||
        `${attendanceDate.toISOString().slice(0, 10)}T09:00:00.000Z`,
      punchOut: safeString(payload?.punch_out),
      remarks: safeString(payload?.remarks),
    };
  } catch (error) {
    console.error("[biometric-mapper] fallback row:", error);
    return emptyBiometricCreateInput(employeeId);
  }
}

/** Map snake_case bulk payload for Supabase direct insert (same 22 columns). */
export function mapToBiometricAttendanceRow(
  row: AttendanceBulkDbPayload,
  employeeId: string | null | undefined
): Record<string, unknown> {
  const prismaRow = mapToBiometricAttendanceCreate(row, employeeId);
  return {
    employee_id: prismaRow.employeeId,
    attendance_date: prismaRow.attendanceDate
      ? new Date(prismaRow.attendanceDate).toISOString().slice(0, 10)
      : todayIsoDate(),
    srl_number: prismaRow.srlNumber ?? "",
    pay_code: prismaRow.payCode ?? "",
    card_number: prismaRow.cardNumber ?? "",
    employee_name: prismaRow.employeeName ?? "",
    department: prismaRow.department ?? "",
    designation: prismaRow.designation ?? "",
    shift: prismaRow.shift ?? "",
    start: prismaRow.start ?? "",
    in_time: prismaRow.inTime ?? "",
    lunch_out: prismaRow.lunchOut ?? "",
    lunch_in: prismaRow.lunchIn ?? "",
    out_time: prismaRow.outTime ?? "",
    hours_worked: prismaRow.hoursWorked ?? "",
    status: prismaRow.status ?? "",
    early_arrival: prismaRow.earlyArrival ?? "",
    shift_late: prismaRow.shiftLate ?? "",
    shift_early: prismaRow.shiftEarly ?? "",
    excess_lunch: prismaRow.excessLunch ?? "",
    ot: prismaRow.ot ?? "",
    overtime: prismaRow.overtime ?? "",
    overstay: prismaRow.overstay ?? "",
    manual: prismaRow.manual ?? "",
    punch_in: prismaRow.punchIn ?? "",
    punch_out: prismaRow.punchOut ?? "",
    remarks: prismaRow.remarks ?? "",
  };
}
