export const PARTS_ORDER_STAGES = [
  "operator_request",
  "supervisor_verification",
  "ho_transit_dispatch",
  "factory_receipt",
  "repair_logs",
] as const;

export type PartsOrderStage = (typeof PARTS_ORDER_STAGES)[number];

export const PARTS_ORDER_STAGE_LABELS: Record<PartsOrderStage, string> = {
  operator_request: "Stage 1 · Operator Request Entry",
  supervisor_verification: "Stage 2 · Supervisor / Manager Verification",
  ho_transit_dispatch: "Stage 3 · Head Office Purchase & Transit Dispatch",
  factory_receipt: "Stage 4 · Factory Receipt Seal",
  repair_logs: "Stage 5 · Repair Logs & Future Inspection Calendar",
};

export const PARTS_ORDER_STAGE_SHORT_LABELS: Record<PartsOrderStage, string> = {
  operator_request: "Operator Request",
  supervisor_verification: "Supervisor Verify",
  ho_transit_dispatch: "HO Transit Dispatch",
  factory_receipt: "Factory Receipt",
  repair_logs: "Repair Logs",
};

export type PartsOrderTransitStatus = "pending" | "due_in_transit" | "received" | "completed";

export type PartsOrderRecord = {
  id: string;
  orderNumber: string;
  workflowStage: PartsOrderStage;
  operatorEmployeeId: string;
  operatorEmployeeName: string;
  machineName: string;
  partsItemNeeded: string;
  partPhoto: string;
  supervisorVerifiedAt: string;
  supervisorVerifiedBy: string;
  sentToDestinationId: string;
  sentToDestinationName: string;
  vehicleDispatchedId: string;
  vehicleRegistration: string;
  transitWaybillPhoto: string;
  transitStatus: PartsOrderTransitStatus;
  receivedAt: string;
  receivedBy: string;
  repairDate: string;
  actionTakenLog: string;
  nextPreventiveCheckDate: string;
  createdAt: string;
  updatedAt: string;
};

export type PartsOrderFormState = Omit<
  PartsOrderRecord,
  "id" | "createdAt" | "updatedAt"
>;

export const EMPTY_PARTS_ORDER_FORM: PartsOrderFormState = {
  orderNumber: "",
  workflowStage: "operator_request",
  operatorEmployeeId: "",
  operatorEmployeeName: "",
  machineName: "",
  partsItemNeeded: "",
  partPhoto: "",
  supervisorVerifiedAt: "",
  supervisorVerifiedBy: "",
  sentToDestinationId: "",
  sentToDestinationName: "",
  vehicleDispatchedId: "",
  vehicleRegistration: "",
  transitWaybillPhoto: "",
  transitStatus: "pending",
  receivedAt: "",
  receivedBy: "",
  repairDate: "",
  actionTakenLog: "",
  nextPreventiveCheckDate: "",
};

export function nextPartsOrderStage(current: PartsOrderStage): PartsOrderStage | null {
  const index = PARTS_ORDER_STAGES.indexOf(current);
  if (index < 0 || index >= PARTS_ORDER_STAGES.length - 1) return null;
  return PARTS_ORDER_STAGES[index + 1];
}

export function normalizePartsOrderRecord(
  row: Partial<PartsOrderRecord> & Pick<PartsOrderRecord, "id">
): PartsOrderRecord {
  return {
    id: row.id,
    orderNumber: row.orderNumber ?? "",
    workflowStage: PARTS_ORDER_STAGES.includes(row.workflowStage as PartsOrderStage)
      ? (row.workflowStage as PartsOrderStage)
      : "operator_request",
    operatorEmployeeId: row.operatorEmployeeId ?? "",
    operatorEmployeeName: row.operatorEmployeeName ?? "",
    machineName: row.machineName ?? "",
    partsItemNeeded: row.partsItemNeeded ?? "",
    partPhoto: row.partPhoto ?? "",
    supervisorVerifiedAt: row.supervisorVerifiedAt ?? "",
    supervisorVerifiedBy: row.supervisorVerifiedBy ?? "",
    sentToDestinationId: row.sentToDestinationId ?? "",
    sentToDestinationName: row.sentToDestinationName ?? "",
    vehicleDispatchedId: row.vehicleDispatchedId ?? "",
    vehicleRegistration: row.vehicleRegistration ?? "",
    transitWaybillPhoto: row.transitWaybillPhoto ?? "",
    transitStatus: row.transitStatus ?? "pending",
    receivedAt: row.receivedAt ?? "",
    receivedBy: row.receivedBy ?? "",
    repairDate: row.repairDate ?? "",
    actionTakenLog: row.actionTakenLog ?? "",
    nextPreventiveCheckDate: row.nextPreventiveCheckDate ?? "",
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateOperatorRequestForm(form: PartsOrderFormState): string | null {
  if (!form.operatorEmployeeId) return "Operator employee is required.";
  if (!form.machineName.trim()) return "Department selection is required.";
  if (!form.partsItemNeeded.trim()) return "Parts item needed is required.";
  if (!form.partPhoto.trim()) return "Mandatory part photo upload is required.";
  return null;
}

export function validateHoDispatchForm(form: PartsOrderFormState): string | null {
  if (!form.sentToDestinationId) return "Sent to destination is required.";
  if (!form.vehicleDispatchedId) return "Vehicle dispatched through is required.";
  if (!form.transitWaybillPhoto.trim()) return "Mandatory transit waybill photo is required.";
  return null;
}

export function validateRepairLogForm(form: PartsOrderFormState): string | null {
  if (!form.repairDate.trim()) return "Repair date is required.";
  if (!form.actionTakenLog.trim()) return "Action taken log is required.";
  if (!form.nextPreventiveCheckDate.trim()) {
    return "Next preventive checking / change date is required.";
  }
  return null;
}
