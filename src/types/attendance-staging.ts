export type AttendanceStagingStatus = "Pending" | "Approved";

export type AttendanceAuditChangeType =
  | "Edit"
  | "Approve"
  | "Bulk Approve"
  | "Upload"
  | "Upsert"
  | "Transfer";

export type AttendanceUserRole = "Supervisor" | "HR-Admin" | "Payroll-Admin";

export type AttendanceStagingRow = {
  id: string;
  employeeId: string | null;
  payCode: string;
  employeeName: string;
  date: string;
  shiftDate: string;
  machineInTime: string | null;
  machineOutTime: string | null;
  correctedInTime: string | null;
  correctedOutTime: string | null;
  duration: string;
  otHours: string;
  status: AttendanceStagingStatus;
  isAnomaly: boolean;
  anomalyReason: string;
  editRemark: string;
  isLocked: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceAuditLogEntry = {
  id: string;
  stagingId: string;
  changedBy: string;
  changeType: AttendanceAuditChangeType;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  remark: string;
  timestamp: string;
};

export type StagingValidationResult = {
  isAnomaly: boolean;
  anomalyReason: string;
  isDuplicate: boolean;
};

export const STAGING_STORAGE_KEY = "shaandar-crm-attendance-staging";
export const STAGING_AUDIT_STORAGE_KEY = "shaandar-crm-attendance-staging-audit";
