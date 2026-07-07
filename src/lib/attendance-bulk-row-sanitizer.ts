import { virtualBulkRowToDbPayload } from "@/lib/attendance-bulk-virtual-mapper";
import { normalizeAttendanceDateIso, normalizeBiometric23ColumnRecord } from "@/types/attendance-bulk-import-row";
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
): AttendanceBulkDbPayload {
  try {
    if (!raw || typeof raw !== "object") {
      const fallbackDate = todayIsoDate();
      return atomicFinalizeBulkDbPayload(
        buildBulkDbPayload({
          row: normalizeBiometric23ColumnRecord(null, { defaultDate: fallbackDate }),
          employeeId: `IMPORT-${Date.now()}`,
          attendanceDate: fallbackDate,
        })
      );
    }

    const normalizedKeys = normalizeRawRowKeys(raw);

    const virtualPayload = virtualBulkRowToDbPayload(normalizedKeys);
    if (virtualPayload) {
      const punchIn =
        fuzzyReadBulkField(normalizedKeys, ["punch_in", "punchIn", "in"]) ||
        virtualPayload.punch_in ||
        fallbackPunchIn(virtualPayload.attendance_date);

      return atomicFinalizeBulkDbPayload({
        ...virtualPayload,
        punch_in: punchIn,
        punch_out:
          fuzzyReadBulkField(normalizedKeys, ["punch_out", "punchOut", "out"]) ||
          virtualPayload.punch_out ||
          "",
      });
    }

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

    const hasIdentity = Boolean(employeeId || employeeName || payCode || cardNumber);

    const rawDate =
      fuzzyReadBulkField(normalizedKeys, ["date", "attendance_date", "attendanceDate"]) || "";
    const attendanceDate = normalizeAttendanceDateIso(rawDate);

    const biometric = sanitizeBulkRowInput(normalizedKeys);
    const payload = atomicFinalizeBulkDbPayload(
      buildBulkDbPayload({
        row: biometric,
        employeeId:
          employeeId ||
          payCode ||
          cardNumber ||
          employeeName ||
          (hasIdentity ? "" : `IMPORT-${Date.now()}`),
        attendanceDate: attendanceDate || todayIsoDate(),
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
      date: attendanceDate,
      punch_in: punchIn,
      punch_out: punchOut,
      overtime_hours: overtimeHours,
      ot: safeString(payload.ot) || "0",
      overtime_amount: safeString(payload.overtime_amount) || "0",
      over_stay: safeString(payload.over_stay) || "0",
      manual: safeString(payload.manual) || "0",
      remarks:
        fuzzyReadBulkField(normalizedKeys, ["remarks", "shift_remarks", "shiftRemarks"]) ||
        payload.remarks,
    });
  } catch (error) {
    console.error("[bulk-import] sanitizeIncomingBulkRow failed:", error);
    const fallbackDate = todayIsoDate();
    return atomicFinalizeBulkDbPayload(
      buildBulkDbPayload({
        row: normalizeBiometric23ColumnRecord(null, { defaultDate: fallbackDate }),
        employeeId: `IMPORT-${Date.now()}`,
        attendanceDate: fallbackDate,
      })
    );
  }
}
