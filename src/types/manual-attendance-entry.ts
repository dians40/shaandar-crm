export type ManualAttendanceStatus =
  | "Present Day Shift"
  | "Present Night Shift"
  | "Half Day Shift"
  | "Half Night Shift";

export type WorkShift = "day" | "night";

export type OvertimeShiftType = "day" | "night";

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
  { value: "Present Day Shift", label: "Present Day Shift" },
  { value: "Present Night Shift", label: "Present Night Shift" },
  { value: "Half Day Shift", label: "Half Day Shift" },
  { value: "Half Night Shift", label: "Half Night Shift" },
];

export const OVERTIME_SHIFT_OPTIONS: { value: OvertimeShiftType; label: string }[] = [
  { value: "day", label: "Day Shift" },
  { value: "night", label: "Night Shift" },
];

export const EMPTY_MANUAL_ATTENDANCE_FORM: ManualAttendanceFormState = {
  employeeId: "",
  attendanceDate: new Date().toISOString().slice(0, 10),
  status: "",
  overtimeShift: "",
  dailyWage: "",
  remarks: "",
};

export function resolveAttendanceStatusParts(status: ManualAttendanceStatus): {
  workShift: WorkShift;
  isHalfDay: boolean;
} {
  switch (status) {
    case "Present Night Shift":
      return { workShift: "night", isHalfDay: false };
    case "Half Day Shift":
      return { workShift: "day", isHalfDay: true };
    case "Half Night Shift":
      return { workShift: "night", isHalfDay: true };
    case "Present Day Shift":
    default:
      return { workShift: "day", isHalfDay: false };
  }
}

export function formatAttendanceStatusLabel(status: ManualAttendanceStatus | string): string {
  return (
    MANUAL_ATTENDANCE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    String(status)
  );
}

export function formatOvertimeShiftLabel(shift: OvertimeShiftType | ""): string {
  return OVERTIME_SHIFT_OPTIONS.find((option) => option.value === shift)?.label ?? "—";
}

/** @deprecated Legacy helper — work shift is encoded in attendance status. */
export function formatWorkShiftLabel(shift: WorkShift | ""): string {
  if (shift === "night") return "Night Shift";
  if (shift === "day") return "Day Shift";
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
  const { workShift, isHalfDay } = resolveAttendanceStatusParts(status);

  if (isHalfDay) {
    if (workShift === "night") {
      return { punchIn: `${date}T21:00:00.000Z`, punchOut: `${date}T01:00:00.000Z` };
    }
    return { punchIn: `${date}T09:00:00.000Z`, punchOut: `${date}T13:00:00.000Z` };
  }

  if (workShift === "night") {
    const endHour = overtimeShift === "night" ? 8 : 6;
    return {
      punchIn: `${date}T21:00:00.000Z`,
      punchOut: `${date}T${String(endHour).padStart(2, "0")}:00:00.000Z`,
    };
  }

  const endHour = overtimeShift === "day" ? 20 : 18;
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

  const { punchIn, punchOut } = buildAttendanceShiftPunchTimes(
    form.attendanceDate,
    form.status,
    form.overtimeShift
  );

  const remarkParts = [
    form.remarks.trim(),
    form.overtimeShift ? `Overtime Shift: ${formatOvertimeShiftLabel(form.overtimeShift)}` : "",
    employeeName ? `Staff: ${employeeName}` : "",
  ].filter(Boolean);

  return {
    payload: {
      employee_id: form.employeeId,
      punch_in: punchIn,
      ...(punchOut ? { punch_out: punchOut } : {}),
      status: form.status,
      overtime_hours: form.overtimeShift ? 1 : 0,
      remarks: remarkParts.join(" · "),
    },
    error: null,
  };
}
