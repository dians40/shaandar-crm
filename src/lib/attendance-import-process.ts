import type { AttendanceImportRow } from "@/lib/attendance-import-parser";
import {
  buildAttendanceShiftPunchTimes,
  formatAttendanceStatusLabel,
  formatOvertimeShiftLabel,
  normalizeBiometricCode,
  type ManualAttendanceStatus,
  type OvertimeShiftType,
} from "@/types/manual-attendance-entry";

export function buildImportAttendanceRemarks(
  row: AttendanceImportRow,
  employeeName: string
): string {
  const parts = [
    row.remarks.trim(),
    row.overtimeShift ? `Overtime Shift: ${formatOvertimeShiftLabel(row.overtimeShift)}` : "",
    `Status: ${formatAttendanceStatusLabel(row.status)}`,
    `Staff: ${employeeName}`,
    row.employeeCode ? `Code: ${row.employeeCode}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

export function buildImportPunchTimes(row: AttendanceImportRow): {
  punchIn: string;
  punchOut: string;
} {
  const { punchIn, punchOut } = buildAttendanceShiftPunchTimes(
    row.attendanceDate,
    row.status,
    row.overtimeShift
  );

  return { punchIn, punchOut: punchOut ?? "" };
}

export function formatImportStatusLabel(status: ManualAttendanceStatus): string {
  return formatAttendanceStatusLabel(status);
}

export function formatImportOvertimeShiftLabel(shift: OvertimeShiftType | ""): string {
  return formatOvertimeShiftLabel(shift);
}

/** @deprecated Shift is encoded as DY1/G11 on attendance status. */
export function formatImportShiftLabel(status: ManualAttendanceStatus): string {
  return normalizeBiometricCode(status);
}
