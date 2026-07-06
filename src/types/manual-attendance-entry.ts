export type ManualAttendanceStatus = "present" | "absent" | "half_day" | "paid_leave";

export type WorkShift = "day" | "night";

export type OvertimeShiftType = "day_overtime" | "night_overtime";

export type ManualAttendanceFormState = {
  employeeId: string;
  attendanceDate: string;
  status: ManualAttendanceStatus | "";
  workShift: WorkShift | "";
  overtimeHours: string;
  overtimeShift: OvertimeShiftType | "";
  dailyWage: string;
  remarks: string;
};

export const MANUAL_ATTENDANCE_STATUS_OPTIONS: {
  value: ManualAttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Present — Full Day" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "paid_leave", label: "Paid Leave" },
];

export const WORK_SHIFT_OPTIONS: { value: WorkShift; label: string }[] = [
  { value: "day", label: "Day Shift" },
  { value: "night", label: "Night Shift" },
];

export const OVERTIME_SHIFT_OPTIONS: { value: OvertimeShiftType; label: string }[] = [
  { value: "day_overtime", label: "Day Shift Overtime" },
  { value: "night_overtime", label: "Night Shift Overtime" },
];

export const EMPTY_MANUAL_ATTENDANCE_FORM: ManualAttendanceFormState = {
  employeeId: "",
  attendanceDate: new Date().toISOString().slice(0, 10),
  status: "",
  workShift: "",
  overtimeHours: "0",
  overtimeShift: "",
  dailyWage: "",
  remarks: "",
};

export function statusRequiresWorkShift(status: ManualAttendanceFormState["status"]): boolean {
  return status === "present" || status === "half_day";
}

export function formatWorkShiftLabel(shift: WorkShift | ""): string {
  return WORK_SHIFT_OPTIONS.find((option) => option.value === shift)?.label ?? "—";
}

export function formatOvertimeShiftLabel(shift: OvertimeShiftType | ""): string {
  return OVERTIME_SHIFT_OPTIONS.find((option) => option.value === shift)?.label ?? "—";
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
  workShift: WorkShift,
  overtimeHours: number
): { punchIn: string; punchOut?: string } {
  if (status === "absent" || status === "paid_leave") {
    return { punchIn: `${date}T00:00:00.000Z`, punchOut: undefined };
  }

  if (status === "half_day") {
    if (workShift === "night") {
      return { punchIn: `${date}T21:00:00.000Z`, punchOut: `${date}T01:00:00.000Z` };
    }
    return { punchIn: `${date}T09:00:00.000Z`, punchOut: `${date}T13:00:00.000Z` };
  }

  if (workShift === "night") {
    const baseOutHour = 6;
    const endHour = Math.min(12, baseOutHour + Math.floor(overtimeHours));
    return {
      punchIn: `${date}T21:00:00.000Z`,
      punchOut: `${date}T${String(endHour).padStart(2, "0")}:00:00.000Z`,
    };
  }

  const endHour = 18 + overtimeHours;
  return {
    punchIn: `${date}T09:00:00.000Z`,
    punchOut: `${date}T${String(Math.min(23, Math.floor(endHour))).padStart(2, "0")}:00:00.000Z`,
  };
}

export function buildAttendanceSyncPayload(
  form: ManualAttendanceFormState,
  employeeName?: string
): { payload: AttendanceSyncPayload; error: string | null } {
  if (!form.employeeId) return { payload: {} as AttendanceSyncPayload, error: "Select a staff member." };
  if (!form.attendanceDate) return { payload: {} as AttendanceSyncPayload, error: "Attendance date is required." };
  if (!form.status) return { payload: {} as AttendanceSyncPayload, error: "Select an attendance status." };

  const overtimeHours = Number(form.overtimeHours) || 0;
  if (overtimeHours < 0) {
    return { payload: {} as AttendanceSyncPayload, error: "Overtime hours cannot be negative." };
  }

  if (statusRequiresWorkShift(form.status) && !form.workShift) {
    return {
      payload: {} as AttendanceSyncPayload,
      error: "Select Day Shift or Night Shift for Present / Half Day status.",
    };
  }

  if (overtimeHours > 0 && !form.overtimeShift) {
    return {
      payload: {} as AttendanceSyncPayload,
      error: "Select Day Shift Overtime or Night Shift Overtime when logging overtime hours.",
    };
  }

  const workShift = form.workShift || "day";
  const { punchIn, punchOut } = buildAttendanceShiftPunchTimes(
    form.attendanceDate,
    form.status,
    workShift,
    overtimeHours
  );

  const remarkParts = [
    form.remarks.trim(),
    statusRequiresWorkShift(form.status)
      ? `Work Shift: ${formatWorkShiftLabel(workShift)}`
      : "",
    overtimeHours > 0 && form.overtimeShift
      ? `${formatOvertimeShiftLabel(form.overtimeShift)}: ${overtimeHours}h`
      : "",
    employeeName ? `Staff: ${employeeName}` : "",
  ].filter(Boolean);

  return {
    payload: {
      employee_id: form.employeeId,
      punch_in: punchIn,
      ...(punchOut ? { punch_out: punchOut } : {}),
      status: form.status,
      overtime_hours: overtimeHours,
      remarks: remarkParts.join(" · "),
    },
    error: null,
  };
}
