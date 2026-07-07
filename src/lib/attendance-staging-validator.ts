import type { Biometric23ColumnRecord } from "@/types/attendance-bulk-import-row";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import type { StagingValidationResult } from "@/types/attendance-staging";

function safeString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Parse time token + date into ISO timestamp or null. */
export function parseStagingTimestamp(
  dateIso: string,
  timeToken: unknown
): string | null {
  const date = normalizeAttendanceDateIso(dateIso);
  const time = safeString(timeToken);
  if (!date || !time) return null;

  const normalized = time.replace(/\./g, ":");
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  const seconds = match[3] ?? "00";
  const iso = `${date}T${hours}:${minutes}:${seconds}.000Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Night shift: group by shift_date — default calendar date. */
export function resolveShiftDate(
  dateIso: string,
  inTime: unknown,
  outTime: unknown
): string {
  const date = normalizeAttendanceDateIso(dateIso);
  const inTs = parseStagingTimestamp(date, inTime);
  const outTs = parseStagingTimestamp(date, outTime);
  if (inTs && outTs && new Date(outTs) < new Date(inTs)) {
    return date;
  }
  return date;
}

export function validateStagingRow(
  row: Biometric23ColumnRecord,
  existingPayCodesForShift: Set<string>
): StagingValidationResult {
  const payCode = safeString(row.payCode);
  const date = normalizeAttendanceDateIso(row.date);
  const shiftDate = resolveShiftDate(date, row.in, row.out);
  const key = `${payCode}|${shiftDate}`;

  const reasons: string[] = [];

  if (existingPayCodesForShift.has(key)) {
    reasons.push("Duplicate entry for same pay code and shift date");
  }

  const inTs = parseStagingTimestamp(date, row.in);
  const outTs = parseStagingTimestamp(date, row.out);

  if (inTs && outTs && new Date(outTs) < new Date(inTs)) {
    reasons.push("Out time is before in time on same calendar date");
  }

  if (!inTs && !outTs) {
    reasons.push("Missing punch — both in and out are empty");
  } else if (!inTs) {
    reasons.push("Missing in punch");
  } else if (!outTs) {
    reasons.push("Missing out punch — may be filled by evening upload");
  }

  const hours = Number(safeString(row.hoursWorked).replace(/[^\d.]/g, ""));
  if (Number.isFinite(hours) && hours > 16) {
    reasons.push("Unusually high hours worked (>16h)");
  }

  return {
    isAnomaly: reasons.length > 0,
    anomalyReason: reasons.join(" · "),
    isDuplicate: existingPayCodesForShift.has(key),
  };
}

export function bulkRowToStagingPayload(
  row: Biometric23ColumnRecord,
  employeeId: string | null,
  validation: StagingValidationResult
) {
  const date = normalizeAttendanceDateIso(row.date);
  const shiftDate = resolveShiftDate(date, row.in, row.out);
  const machineIn = parseStagingTimestamp(date, row.in);
  const machineOut = parseStagingTimestamp(date, row.out);

  return {
    employee_id: employeeId,
    pay_code: safeString(row.payCode) || "UNKNOWN",
    employee_name: safeString(row.employeeName),
    date,
    shift_date: shiftDate,
    machine_in_time: machineIn,
    machine_out_time: machineOut,
    corrected_in_time: null,
    corrected_out_time: null,
    duration: safeString(row.hoursWorked),
    ot_hours: safeString(row.ot),
    status: "Pending" as const,
    is_anomaly: validation.isAnomaly,
    anomaly_reason: validation.anomalyReason,
    edit_remark: "",
    is_locked: false,
    approved_by: null,
    approved_at: null,
  };
}
