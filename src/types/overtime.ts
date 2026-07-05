import type {
  PaymentSettlementStatus,
  VerificationStage,
} from "@/types/verification-workflow";

export type OvertimeShiftType = "Half Shift" | "Full Shift";

export type OvertimeRecord = {
  id: string;
  /** Day-by-day log date (YYYY-MM-DD) */
  workDate: string;
  employeeId: string;
  employeeName: string;
  /** Contractor or firm from Employee Master assigned-from group */
  assignedFromGroup: string;
  shiftType: OvertimeShiftType;
  fromTime: string;
  toTime: string;
  totalHours: number;
  /** Immediate daily cash payout — independent of monthly salary */
  amountPaidToday: number;
  /** @deprecated Use amountPaidToday — kept for legacy localStorage rows */
  amountToPay?: number;
  assignedMachine: string;
  overtimeReason: string;
  /** Legacy free-text — kept for backward compatibility */
  workLocation: string;
  assignedManager: string;
  workLocationAssignment: string;
  approvedBy: string;
  narration: string;
  workflowStage: VerificationStage;
  paymentStatus: PaymentSettlementStatus;
  operatorVerifiedAt: string | null;
  operatorVerifiedBy: string | null;
  supervisorApprovedAt: string | null;
  supervisorApprovedBy: string | null;
  attachmentPhotos: string[];
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_OVERTIME_FORM: Omit<
  OvertimeRecord,
  "id" | "totalHours" | "createdAt" | "updatedAt" | "amountToPay"
> = {
  workDate: new Date().toISOString().slice(0, 10),
  employeeId: "",
  employeeName: "",
  assignedFromGroup: "",
  shiftType: "Half Shift",
  fromTime: "",
  toTime: "",
  amountPaidToday: 0,
  assignedMachine: "",
  overtimeReason: "",
  workLocation: "",
  assignedManager: "",
  workLocationAssignment: "",
  approvedBy: "",
  narration: "",
  workflowStage: "pending_allocation",
  paymentStatus: "due",
  operatorVerifiedAt: null,
  operatorVerifiedBy: null,
  supervisorApprovedAt: null,
  supervisorApprovedBy: null,
  attachmentPhotos: [],
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
  const amountPaidToday =
    row.amountPaidToday ?? row.amountToPay ?? 0;

  return {
    id: row.id,
    workDate: row.workDate ?? new Date().toISOString().slice(0, 10),
    employeeId: row.employeeId ?? "",
    employeeName: row.employeeName ?? "",
    assignedFromGroup: row.assignedFromGroup ?? "",
    shiftType: row.shiftType ?? "Half Shift",
    fromTime: row.fromTime ?? "",
    toTime: row.toTime ?? "",
    totalHours: row.totalHours ?? calculateOvertimeHours(row.fromTime ?? "", row.toTime ?? ""),
    amountPaidToday,
    assignedMachine: row.assignedMachine ?? "",
    overtimeReason: row.overtimeReason ?? "",
    workLocation: row.workLocation ?? "",
    assignedManager: row.assignedManager ?? "",
    workLocationAssignment:
      row.workLocationAssignment ?? row.workLocation ?? "",
    approvedBy: row.approvedBy ?? "",
    narration: row.narration ?? "",
    workflowStage: row.workflowStage ?? "finalized",
    paymentStatus: row.paymentStatus ?? "due",
    operatorVerifiedAt: row.operatorVerifiedAt ?? null,
    operatorVerifiedBy: row.operatorVerifiedBy ?? null,
    supervisorApprovedAt: row.supervisorApprovedAt ?? null,
    supervisorApprovedBy: row.supervisorApprovedBy ?? null,
    attachmentPhotos: Array.isArray(row.attachmentPhotos) ? row.attachmentPhotos : [],
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}
