import type { Prisma } from "@prisma/client";
import type { AttendanceBulkDbPayload } from "@/lib/attendance-bulk-payload-bridge";
import { sanitizeBulkRowInput } from "@/lib/attendance-bulk-payload-bridge";
import {
  applyDateFallback,
  normalizeBiometric23ColumnRecord,
  normalizeAttendanceDateIso,
  todayIsoDateString,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";

export type BiometricAttendanceCreateManyInput =
  Prisma.BiometricAttendanceCreateManyInput;

/** @deprecated Use BiometricAttendanceCreateManyInput */
export type AttendanceCreateManyInput = BiometricAttendanceCreateManyInput;

function safeString(value: unknown): string | null {
  try {
    if (value == null) return null;
    const token = String(value).trim();
    return token || null;
  } catch {
    return null;
  }
}

function safeNumericToken(value: unknown): string | null {
  try {
    const token = safeString(value);
    if (!token) return null;
    const cleaned = token.replace(/[$,]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? String(parsed) : cleaned;
  } catch {
    return null;
  }
}

function parseSrlNo(value: unknown): number | null {
  try {
    const token = safeString(value);
    if (!token) return null;
    const digits = token.replace(/\D/g, "");
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function fuzzyRead(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const direct = source[key];
    if (direct != null && String(direct).trim()) return direct;
    const lower = source[key.toLowerCase()];
    if (lower != null && String(lower).trim()) return lower;
  }
  return undefined;
}

function toBiometricRecord(
  row: AttendanceBulkDbPayload | Biometric23ColumnRecord | Record<string, unknown>,
  defaultDate?: string
): Biometric23ColumnRecord {
  if ("serialNumber" in row && typeof row.serialNumber === "string") {
    return normalizeBiometric23ColumnRecord(row as Biometric23ColumnRecord, { defaultDate });
  }
  if ("srl_number" in row) {
    return normalizeBiometric23ColumnRecord(
      sanitizeBulkRowInput(row as Record<string, unknown>),
      { defaultDate }
    );
  }
  return normalizeBiometric23ColumnRecord(row as Record<string, unknown>, { defaultDate });
}

/** Map bulk import row → Prisma BiometricAttendance create input (canonical columns). */
export function mapToBiometricAttendanceCreate(
  row: AttendanceBulkDbPayload | Biometric23ColumnRecord | Record<string, unknown>,
  _employeeId?: string | null,
  defaultDate?: string
): BiometricAttendanceCreateManyInput {
  try {
    const raw = row as Record<string, unknown>;
    const payload =
      "srl_number" in row && typeof (row as AttendanceBulkDbPayload).srl_number === "string"
        ? (row as AttendanceBulkDbPayload)
        : null;

    const fallbackDate = normalizeAttendanceDateIso(
      defaultDate ||
        safeString(payload?.attendance_date) ||
        safeString(payload?.date) ||
        applyDateFallback(row as Biometric23ColumnRecord, defaultDate),
      todayIsoDateString()
    );

    const biometric = toBiometricRecord(row, fallbackDate);
    const resolvedDate = normalizeAttendanceDateIso(
      applyDateFallback(biometric, fallbackDate),
      fallbackDate
    );

    const remark =
      safeString(payload?.remarks) ||
      safeString(fuzzyRead(raw, ["remark", "remarks", "shift_remarks"]));

    return {
      srlNo: parseSrlNo(biometric.serialNumber),
      payCode: safeString(biometric.payCode) || "UNKNOWN",
      cardNo: safeString(biometric.cardNumber) || "",
      employeeName: safeString(biometric.employeeName) || "",
      department: safeString(biometric.department) || "",
      designation: safeString(biometric.designation) || "",
      shift: safeString(biometric.shift) || "",
      date: resolvedDate,
      status: safeString(biometric.status) || "",
      inTime: safeString(biometric.in) || "",
      outTime: safeString(biometric.out) || "",
      duration: safeString(biometric.hoursWorked) || "0",
      earlyIn: safeNumericToken(biometric.earlyArrival) ?? "0",
      lateIn: safeNumericToken(biometric.shiftLate) ?? "0",
      earlyOut: safeNumericToken(biometric.shiftEarly) ?? "0",
      lateOut: safeNumericToken(biometric.excessLunch) ?? "0",
      otHours: safeNumericToken(biometric.ot) ?? "0",
      shortHours: safeNumericToken(biometric.manual) ?? "0",
      grossHours: safeString(biometric.hoursWorked) || "0",
      netHours: safeString(biometric.hoursWorked) || "0",
      workCode: safeString(biometric.shift) || "",
      remark: remark || "",
    };
  } catch (error) {
    console.error("[biometric-mapper] fallback row:", error);
    return {
      payCode: "UNKNOWN",
      date: normalizeAttendanceDateIso(defaultDate, todayIsoDateString()),
      duration: "0",
      earlyIn: "0",
      lateIn: "0",
      earlyOut: "0",
      lateOut: "0",
      otHours: "0",
      shortHours: "0",
      grossHours: "0",
      netHours: "0",
    };
  }
}

/** @deprecated Use mapToBiometricAttendanceCreate */
export const mapToAttendanceCreate = mapToBiometricAttendanceCreate;

/** @deprecated Use mapToBiometricAttendanceCreate */
export const mapToBiometricAttendanceCreateLegacy = mapToBiometricAttendanceCreate;

/** Map to Supabase snake_case row (canonical biometric_attendance columns). */
export function mapToBiometricAttendanceRow(
  row: AttendanceBulkDbPayload,
  employeeId?: string | null,
  defaultDate?: string
): Record<string, unknown> {
  const prismaRow = mapToBiometricAttendanceCreate(row, employeeId, defaultDate);
  return {
    srl_no: prismaRow.srlNo ?? null,
    pay_code: prismaRow.payCode ?? null,
    card_no: prismaRow.cardNo ?? null,
    employee_name: prismaRow.employeeName ?? null,
    department: prismaRow.department ?? null,
    designation: prismaRow.designation ?? null,
    shift: prismaRow.shift ?? null,
    date: prismaRow.date ?? null,
    status: prismaRow.status ?? null,
    in_time: prismaRow.inTime ?? null,
    out_time: prismaRow.outTime ?? null,
    duration: prismaRow.duration ?? null,
    early_in: prismaRow.earlyIn ?? null,
    late_in: prismaRow.lateIn ?? null,
    early_out: prismaRow.earlyOut ?? null,
    late_out: prismaRow.lateOut ?? null,
    ot_hours: prismaRow.otHours ?? null,
    short_hours: prismaRow.shortHours ?? null,
    gross_hours: prismaRow.grossHours ?? null,
    net_hours: prismaRow.netHours ?? null,
    work_code: prismaRow.workCode ?? null,
    remark: prismaRow.remark ?? null,
  };
}

/** Map DB row → 23-column grid shape (canonical + legacy column fallbacks). */
export function mapAttendanceRecordFromDb(row: Record<string, unknown>) {
  const date =
    safeString(row.date) ||
    safeString(row.attendance_date ?? row.attendanceDate) ||
    "";

  return {
    id: safeString(row.id) ?? "",
    employeeId: safeString(row.employee_id ?? row.employeeId) ?? "",
    attendanceDate: date,
    srlNumber: String(row.srl_no ?? row.srl_number ?? row.srlNumber ?? ""),
    payCode: safeString(row.pay_code ?? row.payCode) ?? "",
    cardNumber: safeString(row.card_no ?? row.card_number ?? row.cardNumber) ?? "",
    employeeName: safeString(row.employee_name ?? row.employeeName) ?? "",
    department: safeString(row.department) ?? "",
    designation: safeString(row.designation) ?? "",
    shift: safeString(row.shift) ?? "",
    date,
    start: safeString(row.start) ?? "",
    inTime:
      safeString(row.in_time ?? row.inTime) ??
      safeString(row.in) ??
      "",
    lunchOut: safeString(row.lunch_out ?? row.lunchOut) ?? "",
    lunchIn: safeString(row.lunch_in ?? row.lunchIn) ?? "",
    outTime: safeString(row.out_time ?? row.outTime) ?? "",
    hoursWorked:
      safeString(row.duration ?? row.hours_worked ?? row.hoursWorked) ?? "",
    status: safeString(row.status) ?? "",
    earlyArrival: safeString(row.early_in ?? row.early_arrival ?? row.earlyArrival) ?? "",
    shiftLate: safeString(row.late_in ?? row.shift_late ?? row.shiftLate) ?? "",
    shiftEarly: safeString(row.early_out ?? row.shift_early ?? row.shiftEarly) ?? "",
    excessLunch: safeString(row.late_out ?? row.excess_lunch ?? row.excessLunch) ?? "",
    ot: safeString(row.ot_hours ?? row.ot) ?? "",
    overtime: safeString(row.overtime) ?? "",
    overstay: safeString(row.overstay) ?? "",
    manual: safeString(row.short_hours ?? row.manual) ?? "",
  };
}
