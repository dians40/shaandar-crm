export const VERIFICATION_STAGES = [
  "pending_allocation",
  "operator_verification",
  "supervisor_approval",
  "finalized",
] as const;

export type VerificationStage = (typeof VERIFICATION_STAGES)[number];

export type PaymentSettlementStatus = "due" | "paid";

export const VERIFICATION_STAGE_LABELS: Record<VerificationStage, string> = {
  pending_allocation: "Stage 1 · Pending Machine Allocation",
  operator_verification: "Stage 2 · Operator Verification",
  supervisor_approval: "Stage 3 · Supervisor Final Approval",
  finalized: "Stage 4 · Finalized / Settlement",
};

export const VERIFICATION_STAGE_SHORT_LABELS: Record<VerificationStage, string> = {
  pending_allocation: "Machine Allocation",
  operator_verification: "Operator Verify",
  supervisor_approval: "Supervisor Approve",
  finalized: "Finalized",
};

export function nextVerificationStage(
  current: VerificationStage
): VerificationStage | null {
  const index = VERIFICATION_STAGES.indexOf(current);
  if (index < 0 || index >= VERIFICATION_STAGES.length - 1) return null;
  return VERIFICATION_STAGES[index + 1];
}

export function isOperatorLocked(stage: VerificationStage): boolean {
  return (
    stage === "supervisor_approval" ||
    stage === "finalized"
  );
}

export const MAX_SUPERVISOR_ATTACHMENT_PHOTOS = 3;

export const ATTENDANCE_WORKFLOW_STORAGE_KEY = "shaandar-crm-attendance-workflow";
export const PAYROLL_ATTENDANCE_TALLY_STORAGE_KEY =
  "shaandar-crm-payroll-attendance-tally";
