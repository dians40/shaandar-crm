import type { VerificationStage } from "@/types/verification-workflow";

export type AttendanceWorkflowSource = "webhook" | "manual";

export type AttendanceWorkflowRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  punchIn: string;
  punchOut: string;
  assignedMachine: string;
  workflowStage: VerificationStage;
  operatorVerifiedAt: string | null;
  operatorVerifiedBy: string | null;
  supervisorApprovedAt: string | null;
  supervisorApprovedBy: string | null;
  attachmentPhotos: string[];
  source: AttendanceWorkflowSource;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceWorkflowNotesPayload = {
  source: AttendanceWorkflowSource;
  workflowStage: VerificationStage;
  punchIn: string;
  punchOut: string;
  assignedMachine: string;
  attachmentPhotos: string[];
  operatorVerifiedAt: string | null;
  operatorVerifiedBy: string | null;
  supervisorApprovedAt: string | null;
  supervisorApprovedBy: string | null;
  employeeName?: string;
  manualStatus?: string;
  overtimeHours?: number;
  overtimeShift?: "DY1" | "G11" | null;
  shiftRemarks?: string;
};

export function normalizeAttendanceWorkflowRecord(
  row: Partial<AttendanceWorkflowRecord> & Pick<AttendanceWorkflowRecord, "id">
): AttendanceWorkflowRecord {
  return {
    id: row.id,
    employeeId: row.employeeId ?? "",
    employeeName: row.employeeName ?? "",
    attendanceDate: row.attendanceDate ?? new Date().toISOString().slice(0, 10),
    punchIn: row.punchIn ?? "",
    punchOut: row.punchOut ?? "",
    assignedMachine: row.assignedMachine ?? "",
    workflowStage: row.workflowStage ?? "pending_allocation",
    operatorVerifiedAt: row.operatorVerifiedAt ?? null,
    operatorVerifiedBy: row.operatorVerifiedBy ?? null,
    supervisorApprovedAt: row.supervisorApprovedAt ?? null,
    supervisorApprovedBy: row.supervisorApprovedBy ?? null,
    attachmentPhotos: Array.isArray(row.attachmentPhotos) ? row.attachmentPhotos : [],
    source: row.source ?? "manual",
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function parseAttendanceWorkflowNotes(
  notes: string | null | undefined
): AttendanceWorkflowNotesPayload | null {
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as Partial<AttendanceWorkflowNotesPayload>;
    if (!parsed || typeof parsed !== "object" || !parsed.workflowStage) return null;
    return {
      source: parsed.source ?? "webhook",
      workflowStage: parsed.workflowStage,
      punchIn: parsed.punchIn ?? "",
      punchOut: parsed.punchOut ?? "",
      assignedMachine: parsed.assignedMachine ?? "",
      attachmentPhotos: Array.isArray(parsed.attachmentPhotos)
        ? parsed.attachmentPhotos
        : [],
      operatorVerifiedAt: parsed.operatorVerifiedAt ?? null,
      operatorVerifiedBy: parsed.operatorVerifiedBy ?? null,
      supervisorApprovedAt: parsed.supervisorApprovedAt ?? null,
      supervisorApprovedBy: parsed.supervisorApprovedBy ?? null,
      employeeName: parsed.employeeName,
    };
  } catch {
    return null;
  }
}

export function serializeAttendanceWorkflowNotes(
  payload: AttendanceWorkflowNotesPayload
): string {
  return JSON.stringify(payload);
}

export function buildDefaultAttendanceWorkflowNotes(
  punchIn: string,
  punchOut: string,
  employeeName?: string
): AttendanceWorkflowNotesPayload {
  return {
    source: "webhook",
    workflowStage: "pending_allocation",
    punchIn,
    punchOut,
    assignedMachine: "",
    attachmentPhotos: [],
    operatorVerifiedAt: null,
    operatorVerifiedBy: null,
    supervisorApprovedAt: null,
    supervisorApprovedBy: null,
    employeeName,
  };
}
