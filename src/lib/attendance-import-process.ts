import type { AttendanceImportRow } from "@/lib/attendance-import-parser";
import {
  buildAttendanceShiftPunchTimes,
  formatAttendanceStatusLabel,
  formatOvertimeShiftLabel,
  resolveAttendanceStatusParts,
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
  if (!shift) return "None";
  return formatOvertimeShiftLabel(shift);
}

/** @deprecated Shift is encoded in attendance status label. */
export function formatImportShiftLabel(status: ManualAttendanceStatus): string {
  const { workShift } = resolveAttendanceStatusParts(status);
  return workShift === "night" ? "Night Shift" : "Day Shift";
}
