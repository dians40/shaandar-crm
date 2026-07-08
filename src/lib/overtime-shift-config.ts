import {
  BIOMETRIC_DAY_CODE,
  BIOMETRIC_NIGHT_CODE,
  formatAttendanceStatusLabel,
} from "@/types/manual-attendance-entry";
import { calculateOvertimeHours } from "@/types/overtime";

/** Payroll / OT shift options aligned with attendance configuration plus Half Shift. */
export type PayrollShiftType = typeof BIOMETRIC_DAY_CODE | typeof BIOMETRIC_NIGHT_CODE | "Half Shift";

export const PAYROLL_SHIFT_OPTIONS: { value: PayrollShiftType; label: string }[] = [
  {
    value: BIOMETRIC_DAY_CODE,
    label: `${BIOMETRIC_DAY_CODE} — ${formatAttendanceStatusLabel(BIOMETRIC_DAY_CODE)} Day Shift`,
  },
  {
    value: BIOMETRIC_NIGHT_CODE,
    label: `${BIOMETRIC_NIGHT_CODE} — ${formatAttendanceStatusLabel(BIOMETRIC_NIGHT_CODE)} Night Shift`,
  },
  { value: "Half Shift", label: "Half Shift" },
];

export function isStandardPayrollShift(shiftType: string): boolean {
  return shiftType === BIOMETRIC_DAY_CODE || shiftType === BIOMETRIC_NIGHT_CODE;
}

export function isHalfPayrollShift(shiftType: string): boolean {
  return shiftType === "Half Shift";
}

export function hasValidTimeRange(fromTime: string, toTime: string): boolean {
  return calculateOvertimeHours(fromTime, toTime) > 0;
}

export function resolvePayrollTotalHours(input: {
  shiftType: string;
  fromTime: string;
  toTime: string;
}): number {
  if (hasValidTimeRange(input.fromTime, input.toTime)) {
    return calculateOvertimeHours(input.fromTime, input.toTime);
  }
  if (isStandardPayrollShift(input.shiftType)) return 12;
  if (isHalfPayrollShift(input.shiftType)) return 6;
  return 0;
}

export function validatePayrollShiftOrTime(input: {
  shiftType: string;
  fromTime: string;
  toTime: string;
}): string | null {
  const shiftSelected = Boolean(input.shiftType.trim());
  const timeSelected = hasValidTimeRange(input.fromTime, input.toTime);

  if (shiftSelected || timeSelected) return null;
  return "Provide either a Shift Type or a valid From/To time range (one is required).";
}
