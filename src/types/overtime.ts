import type {
  PaymentSettlementStatus,
  VerificationStage,
} from "@/types/verification-workflow";
import type { PayrollShiftType } from "@/lib/overtime-shift-config";
import { resolvePayrollTotalHours } from "@/lib/overtime-shift-config";
import {
  OVERTIME_PIPELINE_STAGES,
  type OvertimePipelineStage,
} from "@/types/overtime-pipeline";

export type { PayrollShiftType as OvertimeShiftType };

export type OvertimeRecord = {
  id: string;
  /** Day-by-day log date (YYYY-MM-DD) */
  workDate: string;
  employeeId: string;
  employeeName: string;
  /** Contractor name linked from Employee Master (blank when only firm assigned) */
  assignedFromGroup: string;
  shiftType: PayrollShiftType | "";
  fromTime: string;
  toTime: string;
  totalHours: number;
  /** Immediate daily cash payout — independent of monthly salary */
  amountPaidToday: number;
  /** @deprecated Use amountPaidToday — kept for legacy localStorage rows */
  amountToPay?: number;
  /** Department assignment — legacy key name retained in storage */
  assignedMachine: string;
  overtimeReason: string;
  /** Legacy free-text — kept for backward compatibility */
  workLocation: string;
  /** Person substituted for (search-selected employee name) */
  workLocationAssignment: string;
  /** @deprecated Removed from UI — legacy rows only */
  assignedManager?: string;
  /** @deprecated Removed from UI — legacy rows only */
  approvedBy?: string;
  narration: string;
  pipelineStage: OvertimePipelineStage;
  /** @deprecated Legacy verification stage — mapped to pipelineStage on read */
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
  shiftType: "",
  fromTime: "",
  toTime: "",
  amountPaidToday: 0,
  assignedMachine: "",
  overtimeReason: "",
  workLocation: "",
  workLocationAssignment: "",
  narration: "",
  pipelineStage: OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING,
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

export function calculateOvertimePayout(
  totalHours: number,
  hourlyRate: number
): number {
  if (totalHours <= 0 || hourlyRate <= 0) return 0;
  return Math.round(totalHours * hourlyRate * 100) / 100;
}

function mapLegacyShiftType(value: string | undefined): PayrollShiftType | "" {
  const token = String(value ?? "").trim();
  if (token === "DY1" || token === "G11" || token === "Half Shift") return token;
  if (token === "Full Shift") return "DY1";
  if (token.toLowerCase().includes("half")) return "Half Shift";
  return "";
}

function mapLegacyWorkflowToPipeline(
  workflowStage: VerificationStage | undefined,
  paymentStatus: PaymentSettlementStatus | undefined
): OvertimePipelineStage {
  if (workflowStage === "operator_verification") {
    return OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW;
  }
  if (workflowStage === "supervisor_approval") {
    return OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW;
  }
  if (workflowStage === "finalized") {
    return OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED;
  }
  if (paymentStatus === "paid") {
    return OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED;
  }
  return OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING;
}

export function normalizeOvertimeRecord(
  row: Partial<OvertimeRecord> & Pick<OvertimeRecord, "id">
): OvertimeRecord {
  const amountPaidToday = row.amountPaidToday ?? row.amountToPay ?? 0;
  const shiftType = mapLegacyShiftType(row.shiftType);
  const workflowStage = row.workflowStage ?? "pending_allocation";
  const pipelineStage =
    row.pipelineStage ?? mapLegacyWorkflowToPipeline(workflowStage, row.paymentStatus);

  const totalHours =
    row.totalHours ??
    resolvePayrollTotalHours({
      shiftType,
      fromTime: row.fromTime ?? "",
      toTime: row.toTime ?? "",
    });

  return {
    id: row.id,
    workDate: row.workDate ?? new Date().toISOString().slice(0, 10),
    employeeId: row.employeeId ?? "",
    employeeName: row.employeeName ?? "",
    assignedFromGroup: row.assignedFromGroup ?? "",
    shiftType,
    fromTime: row.fromTime ?? "",
    toTime: row.toTime ?? "",
    totalHours,
    amountPaidToday,
    assignedMachine: row.assignedMachine ?? "",
    overtimeReason: row.overtimeReason ?? "",
    workLocation: row.workLocation ?? row.workLocationAssignment ?? "",
    workLocationAssignment: row.workLocationAssignment ?? row.workLocation ?? "",
    assignedManager: row.assignedManager,
    approvedBy: row.approvedBy,
    narration: row.narration ?? "",
    pipelineStage,
    workflowStage,
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

export { resolvePayrollTotalHours };
