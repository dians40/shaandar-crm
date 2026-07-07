/** Row provenance for hybrid legacy + biometric attendance grid. */
export type AttendanceGridSource = "legacy" | "biometric";

/** Canonical 23-column biometric_attendance grid (database schema) + fusion metadata. */
export type BiometricAttendanceGridRow = {
  id: string;
  source: AttendanceGridSource;
  srlNo: string;
  payCode: string;
  cardNo: string;
  employeeName: string;
  department: string;
  designation: string;
  shift: string;
  date: string;
  status: string;
  inTime: string;
  outTime: string;
  duration: string;
  earlyIn: string;
  lateIn: string;
  earlyOut: string;
  lateOut: string;
  otHours: string;
  shortHours: string;
  grossHours: string;
  netHours: string;
  workCode: string;
  remark: string;
  createdAt: string;
};

export const BIOMETRIC_ATTENDANCE_GRID_COLUMNS: {
  key: keyof BiometricAttendanceGridRow;
  label: string;
}[] = [
  { key: "srlNo", label: "Srl No" },
  { key: "payCode", label: "Pay Code" },
  { key: "cardNo", label: "Card No" },
  { key: "employeeName", label: "Employee Name" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "shift", label: "Shift" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "inTime", label: "In Time" },
  { key: "outTime", label: "Out Time" },
  { key: "duration", label: "Duration" },
  { key: "earlyIn", label: "Early In" },
  { key: "lateIn", label: "Late In" },
  { key: "earlyOut", label: "Early Out" },
  { key: "lateOut", label: "Late Out" },
  { key: "otHours", label: "OT Hours" },
  { key: "shortHours", label: "Short Hours" },
  { key: "grossHours", label: "Gross Hours" },
  { key: "netHours", label: "Net Hours" },
  { key: "workCode", label: "Work Code" },
  { key: "remark", label: "Remark" },
  { key: "createdAt", label: "Created At" },
];

export const BIOMETRIC_ATTENDANCE_GRID_COLUMN_COUNT = 23;
