export type ManualAttendanceStatus = "present" | "absent" | "half_day" | "paid_leave";

export type ManualAttendanceFormState = {
  employeeId: string;
  attendanceDate: string;
  status: ManualAttendanceStatus | "";
  overtimeHours: string;
  remarks: string;
};

export const MANUAL_ATTENDANCE_STATUS_OPTIONS: {
  value: ManualAttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Present (🔴 पूर्ण उपस्थिति)" },
  { value: "absent", label: "Absent (❌ अनुपस्थित)" },
  { value: "half_day", label: "Half Day (🟡 आधा दिन)" },
  { value: "paid_leave", label: "Paid Leave" },
];

export const EMPTY_MANUAL_ATTENDANCE_FORM: ManualAttendanceFormState = {
  employeeId: "",
  attendanceDate: new Date().toISOString().slice(0, 10),
  status: "",
  overtimeHours: "0",
  remarks: "",
};

export type AttendanceSyncPayload = {
  employee_id: string;
  punch_in: string;
  punch_out?: string;
  status: ManualAttendanceStatus;
  overtime_hours: number;
  remarks: string;
};

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

  const date = form.attendanceDate;
  let punchIn = `${date}T09:00:00.000Z`;
  let punchOut: string | undefined = `${date}T18:00:00.000Z`;

  switch (form.status) {
    case "absent":
    case "paid_leave":
      punchIn = `${date}T00:00:00.000Z`;
      punchOut = undefined;
      break;
    case "half_day":
      punchOut = `${date}T13:00:00.000Z`;
      break;
    case "present":
    default:
      if (overtimeHours > 0) {
        const endHour = 18 + overtimeHours;
        punchOut = `${date}T${String(Math.min(23, Math.floor(endHour))).padStart(2, "0")}:00:00.000Z`;
      }
      break;
  }

  const remarks = [form.remarks.trim(), employeeName ? `Staff: ${employeeName}` : ""]
    .filter(Boolean)
    .join(" · ");

  return {
    payload: {
      employee_id: form.employeeId,
      punch_in: punchIn,
      ...(punchOut ? { punch_out: punchOut } : {}),
      status: form.status,
      overtime_hours: overtimeHours,
      remarks,
    },
    error: null,
  };
}
