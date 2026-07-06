import {
  atomicFinalizeBulkDbPayload,
  buildBulkDbPayload,
  safeBulkNumeric,
  sanitizeBulkRowInput,
  type AttendanceBulkDbPayload,
} from "@/lib/attendance-bulk-payload-bridge";
import { normalizeRawRowKeys } from "@/lib/attendance-bulk-header-normalizer";

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function fallbackPunchIn(date: string): string {
  return `${date || todayIsoDate()}T09:00:00.000Z`;
}

/** Aggressive fuzzy read — never throws; numeric fields default to 0, strings to "". */
export function fuzzyReadBulkField(
  source: Record<string, unknown>,
  keys: string[]
): string {
  try {
    for (const key of keys) {
      const direct = safeString(source[key]);
      if (direct) return direct;

      const lower = safeString(source[key.toLowerCase()]);
      if (lower) return lower;

      const collapsed = key.replace(/_/g, "");
      const fuzzy = safeString(source[collapsed] ?? source[collapsed.toLowerCase()]);
      if (fuzzy) return fuzzy;
    }
    return "";
  } catch {
    return "";
  }
}

/** Normalize any incoming bulk row shape into a safe DB payload with guaranteed punch_in. */
export function sanitizeIncomingBulkRow(
  raw: Record<string, unknown> | null | undefined
): AttendanceBulkDbPayload | null {
  try {
    if (!raw || typeof raw !== "object") return null;

    const normalizedKeys = normalizeRawRowKeys(raw);

    const employeeId = fuzzyReadBulkField(normalizedKeys, [
      "employee_id",
      "employeeId",
      "employeeid",
    ]);
    const employeeName = fuzzyReadBulkField(normalizedKeys, [
      "employee_name",
      "employeeName",
      "employeename",
      "name",
    ]);
    const payCode = fuzzyReadBulkField(normalizedKeys, [
      "pay_code",
      "payCode",
      "paycode",
      "emp_code",
      "employeecode",
    ]);
    const cardNumber = fuzzyReadBulkField(normalizedKeys, [
      "card_number",
      "cardNumber",
      "cardno",
      "card_no",
    ]);

    if (!employeeId && !employeeName && !payCode && !cardNumber) {
      return null;
    }

    const attendanceDate =
      fuzzyReadBulkField(normalizedKeys, ["attendance_date", "attendanceDate"]) ||
      todayIsoDate();

    const biometric = sanitizeBulkRowInput(normalizedKeys);
    const payload = atomicFinalizeBulkDbPayload(
      buildBulkDbPayload({
        row: biometric,
        employeeId: employeeId || payCode || cardNumber || employeeName,
        attendanceDate,
      })
    );

    const punchIn =
      fuzzyReadBulkField(normalizedKeys, ["punch_in", "punchIn", "in"]) ||
      payload.punch_in ||
      fallbackPunchIn(attendanceDate);

    const punchOut =
      fuzzyReadBulkField(normalizedKeys, ["punch_out", "punchOut", "out"]) ||
      payload.punch_out ||
      "";

    const overtimeHours =
      safeBulkNumeric(
        normalizedKeys.overtime_hours ??
          normalizedKeys.overtimeHours ??
          normalizedKeys.ot ??
          normalizedKeys.overtime_amount ??
          normalizedKeys.overtimeAmount ??
          normalizedKeys.over_stay ??
          normalizedKeys.overStay ??
          normalizedKeys.manual
      ) || payload.overtime_hours;

    return atomicFinalizeBulkDbPayload({
      ...payload,
      employee_id: employeeId,
      employee_name: payload.employee_name || employeeName,
      pay_code: payload.pay_code || payCode,
      card_number: payload.card_number || cardNumber,
      attendance_date: attendanceDate,
      punch_in: punchIn,
      punch_out: punchOut,
      overtime_hours: overtimeHours,
      ot: safeString(payload.ot),
      overtime_amount: safeString(payload.overtime_amount),
      over_stay: safeString(payload.over_stay),
      manual: safeString(payload.manual),
      remarks:
        fuzzyReadBulkField(normalizedKeys, ["remarks", "shift_remarks", "shiftRemarks"]) ||
        payload.remarks,
    });
  } catch (error) {
    console.error("[bulk-import] sanitizeIncomingBulkRow failed:", error);
    return null;
  }
}
