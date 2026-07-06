import type { AttendanceImportRow } from "@/lib/attendance-import-parser";
import {
  buildAttendanceShiftPunchTimes,
  formatOvertimeShiftLabel,
  formatWorkShiftLabel,
  statusRequiresWorkShift,
  type ManualAttendanceStatus,
  type OvertimeShiftType,
  type WorkShift,
} from "@/types/manual-attendance-entry";

export function buildImportAttendanceRemarks(
  row: AttendanceImportRow,
  employeeName: string
): string {
  const parts = [
    row.remarks.trim(),
    statusRequiresWorkShift(row.status) && row.workShift
      ? `Work Shift: ${formatWorkShiftLabel(row.workShift)}`
      : "",
    row.overtimeHours > 0 && row.overtimeShift
      ? `${formatOvertimeShiftLabel(row.overtimeShift)}: ${row.overtimeHours}h`
      : row.overtimeHours > 0
        ? `Overtime: ${row.overtimeHours}h`
        : "",
    `Staff: ${employeeName}`,
    row.employeeCode ? `Code: ${row.employeeCode}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

export function buildImportPunchTimes(row: AttendanceImportRow): {
  punchIn: string;
  punchOut: string;
} {
  const workShift: WorkShift = row.workShift || "day";
  const { punchIn, punchOut } = buildAttendanceShiftPunchTimes(
    row.attendanceDate,
    row.status as ManualAttendanceStatus,
    statusRequiresWorkShift(row.status) ? workShift : "day",
    row.overtimeHours
  );

  return { punchIn, punchOut: punchOut ?? "" };
}

export function formatImportShiftLabel(shift: WorkShift | ""): string {
  return formatWorkShiftLabel(shift);
}

export function formatImportOvertimeShiftLabel(shift: OvertimeShiftType | ""): string {
  return formatOvertimeShiftLabel(shift);
}
