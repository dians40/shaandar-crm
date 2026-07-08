import {
  extractUserRemarkFromPipelineRemark,
} from "@/lib/pipeline-stage-remark-compat";
import type {
  AttendanceAuditLogEntry,
  AttendanceStagingRow,
} from "@/types/attendance-staging";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import {
  normalizeAttendanceWorkflowRecord,
  type AttendanceWorkflowRecord,
} from "@/types/attendance-workflow";

function safeString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function mapStagingRowFromDb(row: Record<string, unknown>): AttendanceStagingRow {
  return {
    id: safeString(row.id),
    employeeId: row.employee_id ? safeString(row.employee_id) : null,
    payCode: safeString(row.pay_code),
    employeeName: safeString(row.employee_name),
    date: safeString(row.date).slice(0, 10),
    shiftDate: safeString(row.shift_date).slice(0, 10),
    machineInTime: row.machine_in_time ? safeString(row.machine_in_time) : null,
    machineOutTime: row.machine_out_time ? safeString(row.machine_out_time) : null,
    correctedInTime: row.corrected_in_time ? safeString(row.corrected_in_time) : null,
    correctedOutTime: row.corrected_out_time ? safeString(row.corrected_out_time) : null,
    duration: safeString(row.duration),
    otHours: safeString(row.ot_hours),
    status: row.status === "Approved" ? "Approved" : "Pending",
    isAnomaly: Boolean(row.is_anomaly),
    anomalyReason: safeString(row.anomaly_reason),
    editRemark: safeString(row.edit_remark),
    department: safeString(row.department),
    designation: safeString(row.designation),
    isLocked: Boolean(row.is_locked),
    approvedBy: row.approved_by ? safeString(row.approved_by) : null,
    approvedAt: row.approved_at ? safeString(row.approved_at) : null,
    createdAt: safeString(row.created_at),
    updatedAt: safeString(row.updated_at),
  };
}

export function mapAuditLogFromDb(row: Record<string, unknown>): AttendanceAuditLogEntry {
  return {
    id: safeString(row.id),
    stagingId: safeString(row.staging_id),
    changedBy: safeString(row.changed_by),
    changeType: safeString(row.change_type) as AttendanceAuditLogEntry["changeType"],
    oldValue: (row.old_value as Record<string, unknown>) ?? null,
    newValue: (row.new_value as Record<string, unknown>) ?? null,
    remark: safeString(row.remark),
    timestamp: safeString(row.timestamp),
  };
}

export function effectiveInTime(row: AttendanceStagingRow): string | null {
  return row.correctedInTime || row.machineInTime;
}

export function effectiveOutTime(row: AttendanceStagingRow): string | null {
  return row.correctedOutTime || row.machineOutTime;
}

export function mapGridRowToStagingRow(
  row: BiometricAttendanceGridRow,
  index: number
): AttendanceStagingRow {
  const date = row.date.slice(0, 10);
  return {
    id: row.id || `storage-staging-${index}`,
    employeeId: null,
    payCode: row.payCode,
    employeeName: row.employeeName,
    date,
    shiftDate: date,
    machineInTime: row.inTime || null,
    machineOutTime: row.outTime || null,
    correctedInTime: null,
    correctedOutTime: null,
    duration: row.duration,
    otHours: row.otHours,
    status: "Pending",
    isAnomaly: false,
    anomalyReason: "",
    editRemark: extractUserRemarkFromPipelineRemark(row.remark) || row.remark,
    department: row.department || "",
    designation: row.designation || "",
    isLocked: false,
    approvedBy: null,
    approvedAt: null,
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.createdAt || new Date().toISOString(),
  };
}

/** Map attendance_staging Pending row → Live Workflow Stage 1 record. */
export function mapStagingRowToWorkflowRecord(row: AttendanceStagingRow): AttendanceWorkflowRecord {
  const punchIn = effectiveInTime(row) ?? "";
  const punchOut = effectiveOutTime(row) ?? "";
  return normalizeAttendanceWorkflowRecord({
    id: row.id,
    employeeId: row.employeeId ?? row.payCode,
    employeeName: row.employeeName,
    attendanceDate: row.date,
    punchIn,
    punchOut,
    assignedMachine: row.editRemark || "",
    workflowStage: "pending_allocation",
    source: "manual",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
