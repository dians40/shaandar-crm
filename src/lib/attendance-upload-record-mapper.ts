import { normalizeBiometric23ColumnRecord, type Biometric23ColumnRecord } from "@/types/attendance-bulk-import-row";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";

/** Map saved server grid row → 22/23-column upload record shape for display. */
export function gridRowToUploadRecord(row: BiometricAttendanceGridRow): Biometric23ColumnRecord {
  return normalizeBiometric23ColumnRecord({
    serialNumber: row.srlNo,
    payCode: row.payCode,
    cardNumber: row.cardNo,
    employeeName: row.employeeName,
    department: row.department,
    designation: row.designation,
    shift: row.shift,
    date: row.date,
    start: "",
    in: row.inTime,
    lunchOut: "",
    lunchIn: "",
    out: row.outTime,
    hoursWorked: row.duration,
    status: row.status,
    earlyArrival: row.earlyIn,
    shiftLate: row.lateIn,
    shiftEarly: row.earlyOut,
    excessLunch: row.lateOut,
    ot: row.otHours,
    overtimeAmount: "",
    overStay: "",
    manual: row.shortHours || row.remark,
  });
}
