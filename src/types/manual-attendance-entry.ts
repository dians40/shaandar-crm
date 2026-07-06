export type BiometricShiftCode = "DY1" | "G11";

export type ManualAttendanceStatus = BiometricShiftCode;

export type OvertimeShiftType = BiometricShiftCode;

export type WorkShift = "day" | "night";

export const BIOMETRIC_DAY_CODE: BiometricShiftCode = "DY1";
export const BIOMETRIC_NIGHT_CODE: BiometricShiftCode = "G11";

export type ManualAttendanceFormState = {
  employeeId: string;
  attendanceDate: string;
  status: ManualAttendanceStatus | "";
  overtimeShift: OvertimeShiftType | "";
  dailyWage: string;
  remarks: string;
};

export const MANUAL_ATTENDANCE_STATUS_OPTIONS: {
  value: ManualAttendanceStatus;
  label: string;
}[] = [
  { value: "DY1", label: "DY1" },
  { value: "G11", label: "G11" },
];

export const OVERTIME_SHIFT_OPTIONS: { value: OvertimeShiftType; label: string }[] = [
  { value: "DY1", label: "DY1" },
  { value: "G11", label: "G11" },
];

export const EMPTY_MANUAL_ATTENDANCE_FORM: ManualAttendanceFormState = {
  employeeId: "",
  attendanceDate: new Date().toISOString().slice(0, 10),
  status: "",
  overtimeShift: "",
  dailyWage: "",
  remarks: "",
};

export function normalizeBiometricCode(value: unknown): BiometricShiftCode {
  try {
    const token = String(value ?? "")
      .trim()
      .toUpperCase();
    if (!token) return BIOMETRIC_DAY_CODE;
    if (token.includes(BIOMETRIC_NIGHT_CODE) || token.includes("G11")) {
      return BIOMETRIC_NIGHT_CODE;
    }
    if (
      token.includes(BIOMETRIC_DAY_CODE) ||
      token.includes("DY") ||
      token.includes("DAY")
    ) {
      return BIOMETRIC_DAY_CODE;
    }
    return BIOMETRIC_DAY_CODE;
  } catch {
    return BIOMETRIC_DAY_CODE;
  }
}

export function resolveAttendanceStatusParts(status: ManualAttendanceStatus): {
  workShift: WorkShift;
  isHalfDay: boolean;
} {
  if (status === BIOMETRIC_NIGHT_CODE) {
    return { workShift: "night", isHalfDay: false };
  }
  return { workShift: "day", isHalfDay: false };
}

export function formatAttendanceStatusLabel(status: ManualAttendanceStatus | string): string {
  const normalized = normalizeBiometricCode(status);
  return normalized;
}

export function formatOvertimeShiftLabel(shift: OvertimeShiftType | ""): string {
  if (!shift) return "None";
  return normalizeBiometricCode(shift);
}

/** @deprecated Legacy helper — shift is encoded as DY1/G11. */
export function formatWorkShiftLabel(shift: WorkShift | ""): string {
  if (shift === "night") return BIOMETRIC_NIGHT_CODE;
  if (shift === "day") return BIOMETRIC_DAY_CODE;
  return "—";
}

export type AttendanceSyncPayload = {
  employee_id: string;
  punch_in: string;
  punch_out?: string;
  status: ManualAttendanceStatus;
  overtime_hours: number;
  remarks: string;
};

export function buildAttendanceShiftPunchTimes(
  date: string,
  status: ManualAttendanceStatus,
  overtimeShift: OvertimeShiftType | ""
): { punchIn: string; punchOut?: string } {
  const { workShift } = resolveAttendanceStatusParts(status);
  const otBand = overtimeShift ? normalizeBiometricCode(overtimeShift) : null;

  if (workShift === "night") {
    const endHour = otBand === BIOMETRIC_NIGHT_CODE ? 8 : 6;
    return {
      punchIn: `${date}T21:00:00.000Z`,
      punchOut: `${date}T${String(endHour).padStart(2, "0")}:00:00.000Z`,
    };
  }

  const endHour = otBand === BIOMETRIC_DAY_CODE ? 20 : 18;
  return {
    punchIn: `${date}T09:00:00.000Z`,
    punchOut: `${date}T${String(Math.min(23, endHour)).padStart(2, "0")}:00:00.000Z`,
  };
}

export function buildAttendanceSyncPayload(
  form: ManualAttendanceFormState,
  employeeName?: string
): { payload: AttendanceSyncPayload; error: string | null } {
  if (!form.employeeId) return { payload: {} as AttendanceSyncPayload, error: "Select a staff member." };
  if (!form.attendanceDate) return { payload: {} as AttendanceSyncPayload, error: "Attendance date is required." };
  if (!form.status) return { payload: {} as AttendanceSyncPayload, error: "Select an attendance status." };

  const status = normalizeBiometricCode(form.status);
  const overtimeShift = form.overtimeShift ? normalizeBiometricCode(form.overtimeShift) : "";

  const { punchIn, punchOut } = buildAttendanceShiftPunchTimes(
    form.attendanceDate,
    status,
    overtimeShift
  );

  const remarkParts = [
    form.remarks.trim(),
    overtimeShift ? `Overtime Shift: ${overtimeShift}` : "",
    employeeName ? `Staff: ${employeeName}` : "",
  ].filter(Boolean);

  return {
    payload: {
      employee_id: form.employeeId,
      punch_in: punchIn,
      ...(punchOut ? { punch_out: punchOut } : {}),
      status,
      overtime_hours: overtimeShift ? 1 : 0,
      remarks: remarkParts.join(" · "),
    },
    error: null,
  };
}
