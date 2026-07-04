export type OvertimeShiftType = "Half Shift" | "Full Shift";

export type OvertimeRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftType: OvertimeShiftType;
  fromTime: string;
  toTime: string;
  totalHours: number;
  amountToPay: number;
  assignedMachine: string;
  /** Legacy free-text — kept for backward compatibility */
  workLocation: string;
  assignedManager: string;
  workLocationAssignment: string;
  approvedBy: string;
  narration: string;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_OVERTIME_FORM: Omit<
  OvertimeRecord,
  "id" | "totalHours" | "createdAt" | "updatedAt"
> = {
  employeeId: "",
  employeeName: "",
  shiftType: "Half Shift",
  fromTime: "",
  toTime: "",
  amountToPay: 0,
  assignedMachine: "",
  workLocation: "",
  assignedManager: "",
  workLocationAssignment: "",
  approvedBy: "",
  narration: "",
};

export function calculateOvertimeHours(fromTime: string, toTime: string): number {
  const fromMatch = /^(\d{1,2}):(\d{2})$/.exec(fromTime.trim());
  const toMatch = /^(\d{1,2}):(\d{2})$/.exec(toTime.trim());
  if (!fromMatch || !toMatch) return 0;

  const fromMinutes = Number(fromMatch[1]) * 60 + Number(fromMatch[2]);
  const toMinutes = Number(toMatch[1]) * 60 + Number(toMatch[2]);
  if (fromMinutes < 0 || toMinutes < 0) return 0;

  let diff = toMinutes - fromMinutes;
  if (diff < 0) diff += 24 * 60;

  return Math.round((diff / 60) * 100) / 100;
}

export function normalizeOvertimeRecord(
  row: Partial<OvertimeRecord> & Pick<OvertimeRecord, "id">
): OvertimeRecord {
  return {
    id: row.id,
    employeeId: row.employeeId ?? "",
    employeeName: row.employeeName ?? "",
    shiftType: row.shiftType ?? "Half Shift",
    fromTime: row.fromTime ?? "",
    toTime: row.toTime ?? "",
    totalHours: row.totalHours ?? calculateOvertimeHours(row.fromTime ?? "", row.toTime ?? ""),
    amountToPay: row.amountToPay ?? 0,
    assignedMachine: row.assignedMachine ?? "",
    workLocation: row.workLocation ?? "",
    assignedManager: row.assignedManager ?? "",
    workLocationAssignment:
      row.workLocationAssignment ?? row.workLocation ?? "",
    approvedBy: row.approvedBy ?? "",
    narration: row.narration ?? "",
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}
