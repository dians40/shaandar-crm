import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import {
  parseAttendanceWorkflowNotes,
  type AttendanceWorkflowNotesPayload,
  type AttendanceWorkflowRecord,
} from "@/types/attendance-workflow";
import type {
  AttendanceGridSource,
  BiometricAttendanceGridRow,
} from "@/types/biometric-attendance-grid";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";

type LegacyEmployeeRelation =
  | { full_name?: string | null; mobile_number?: string | null; name?: string | null }
  | Array<{ full_name?: string | null; mobile_number?: string | null; name?: string | null }>
  | null;

export type LegacyEmployeeAttendanceDbRow = {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: string;
  notes?: string | null;
  created_at?: string | null;
  employees?: LegacyEmployeeRelation;
};

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function resolveEmployeeRelation(
  relation: LegacyEmployeeRelation | undefined
): { fullName: string; mobileNumber: string } {
  const rel = Array.isArray(relation) ? relation[0] : relation;
  return {
    fullName: safeString(rel?.full_name ?? rel?.name),
    mobileNumber: safeString(rel?.mobile_number),
  };
}

function extractRemarkToken(remarks: string, label: string): string {
  if (!remarks.trim()) return "";
  const pattern = new RegExp(`${label}:\\s*([^·]+)`, "i");
  const match = remarks.match(pattern);
  return safeString(match?.[1]);
}

function formatCreatedAt(value: unknown): string {
  try {
    if (value == null) return "";
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return safeString(value);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatPunchTime(value: string): string {
  const token = safeString(value);
  if (!token) return "";
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(token)) return token;
  try {
    const date = new Date(token);
    if (Number.isNaN(date.getTime())) return token;
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return token;
  }
}

function mapDbStatusLabel(status: string, notes: AttendanceWorkflowNotesPayload | null): string {
  const manualStatus = safeString(notes?.manualStatus);
  if (manualStatus) return manualStatus;
  switch (safeString(status).toLowerCase()) {
    case "present":
      return "Present";
    case "absent":
      return "Absent";
    case "half-day":
      return "Half Day";
    case "leave":
      return "Leave";
    default:
      return status || "—";
  }
}

function buildLegacyShift(notes: AttendanceWorkflowNotesPayload | null): string {
  const manualStatus = safeString(notes?.manualStatus);
  if (manualStatus) return manualStatus;
  const overtimeShift = safeString(notes?.overtimeShift);
  if (overtimeShift) return overtimeShift;
  return "";
}

function parseLegacyNotesLoose(
  notes: string | null | undefined
): AttendanceWorkflowNotesPayload | null {
  const strict = parseAttendanceWorkflowNotes(notes);
  if (strict) return strict;
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as Partial<AttendanceWorkflowNotesPayload>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      source: parsed.source ?? "manual",
      workflowStage: parsed.workflowStage ?? "pending_allocation",
      punchIn: safeString(parsed.punchIn),
      punchOut: safeString(parsed.punchOut),
      assignedMachine: safeString(parsed.assignedMachine),
      attachmentPhotos: Array.isArray(parsed.attachmentPhotos)
        ? parsed.attachmentPhotos
        : [],
      operatorVerifiedAt: parsed.operatorVerifiedAt ?? null,
      operatorVerifiedBy: parsed.operatorVerifiedBy ?? null,
      supervisorApprovedAt: parsed.supervisorApprovedAt ?? null,
      supervisorApprovedBy: parsed.supervisorApprovedBy ?? null,
      employeeName: safeString(parsed.employeeName),
      manualStatus: safeString(parsed.manualStatus),
      overtimeHours:
        parsed.overtimeHours != null && Number.isFinite(Number(parsed.overtimeHours))
          ? Number(parsed.overtimeHours)
          : undefined,
      overtimeShift: parsed.overtimeShift ?? null,
      shiftRemarks: safeString(parsed.shiftRemarks),
    };
  } catch {
    return null;
  }
}

/** Map client workflow / localStorage attendance record → unified grid row. */
export function mapWorkflowRecordToGridRow(
  record: AttendanceWorkflowRecord
): BiometricAttendanceGridRow {
  const attendanceDate = normalizeAttendanceDateIso(record.attendanceDate);
  return {
    id: record.id || `workflow-${record.employeeId}-${attendanceDate}`,
    source: "legacy",
    srlNo: "",
    payCode: record.employeeId,
    cardNo: "",
    employeeName: record.employeeName || "Unknown Employee",
    department: "",
    designation: "",
    shift: "",
    date: attendanceDate,
    status: "Present",
    inTime: formatPunchTime(record.punchIn),
    outTime: formatPunchTime(record.punchOut),
    duration: "",
    earlyIn: "",
    lateIn: "",
    earlyOut: "",
    lateOut: "",
    otHours: "",
    shortHours: "",
    grossHours: "",
    netHours: "",
    workCode: "",
    remark: record.assignedMachine || "Manual workflow record",
    createdAt: formatCreatedAt(record.createdAt),
  };
}

/** Map public.employee_attendance row → canonical 23-column grid shape. */
export function mapLegacyEmployeeAttendanceToGridRow(
  row: LegacyEmployeeAttendanceDbRow
): BiometricAttendanceGridRow {
  const notes = parseLegacyNotesLoose(row.notes);
  const employee = resolveEmployeeRelation(row.employees);
  const shiftRemarks = safeString(notes?.shiftRemarks ?? notes?.assignedMachine);
  const attendanceDate = normalizeAttendanceDateIso(safeString(row.attendance_date));

  const payCode =
    extractRemarkToken(shiftRemarks, "Pay Code") || employee.mobileNumber || "";
  const cardNo = extractRemarkToken(shiftRemarks, "Card No");
  const srlNo = extractRemarkToken(shiftRemarks, "SRL");
  const hoursWorked = extractRemarkToken(shiftRemarks, "Hours Worked");
  const overStay = extractRemarkToken(shiftRemarks, "Over Stay");
  const manualHours = extractRemarkToken(shiftRemarks, "Manual");
  const overtimeAmount = extractRemarkToken(shiftRemarks, "Overtime Amount");

  const employeeName =
    safeString(notes?.employeeName) || employee.fullName || "Unknown Employee";
  const inTime = formatPunchTime(safeString(notes?.punchIn));
  const outTime = formatPunchTime(safeString(notes?.punchOut));
  const otHours =
    notes?.overtimeHours != null && Number.isFinite(Number(notes.overtimeHours))
      ? String(notes.overtimeHours)
      : overtimeAmount
        ? overtimeAmount.replace(/[^\d.]/g, "")
        : "";

  const remarkParts = [
    shiftRemarks,
    safeString(notes?.assignedMachine),
    row.status ? `Legacy status: ${row.status}` : "",
  ].filter(Boolean);

  return {
    id: safeString(row.id) || `legacy-${row.employee_id}-${attendanceDate}`,
    source: "legacy",
    srlNo,
    payCode,
    cardNo,
    employeeName,
    department: "",
    designation: "",
    shift: buildLegacyShift(notes),
    date: attendanceDate,
    status: mapDbStatusLabel(row.status, notes),
    inTime,
    outTime,
    duration: hoursWorked,
    earlyIn: "",
    lateIn: "",
    earlyOut: "",
    lateOut: overStay,
    otHours,
    shortHours: manualHours,
    grossHours: hoursWorked,
    netHours: hoursWorked,
    workCode: buildLegacyShift(notes),
    remark: remarkParts.join(" · "),
    createdAt: formatCreatedAt(row.created_at),
  };
}

function fusionDedupeKey(row: BiometricAttendanceGridRow): string {
  const id = safeString(row.id);
  if (id) return `${row.source}|${id}`;
  const date = normalizeAttendanceDateIso(row.date);
  const payCode = safeString(row.payCode).toLowerCase();
  const employeeName = safeString(row.employeeName).toLowerCase();
  return `${row.source}|${payCode}|${employeeName}|${date}`;
}

/** Merge biometric + legacy rows — both sources kept; only exact duplicate keys collapse. */
export function mergeAttendanceGridRows(
  biometricRows: BiometricAttendanceGridRow[],
  legacyRows: BiometricAttendanceGridRow[]
): BiometricAttendanceGridRow[] {
  const merged = new Map<string, BiometricAttendanceGridRow>();

  for (const row of legacyRows) {
    merged.set(fusionDedupeKey({ ...row, source: "legacy" }), { ...row, source: "legacy" });
  }

  for (const row of biometricRows) {
    merged.set(fusionDedupeKey({ ...row, source: "biometric" }), {
      ...row,
      source: "biometric",
    });
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftDate = normalizeAttendanceDateIso(left.date);
    const rightDate = normalizeAttendanceDateIso(right.date);
    if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
    if (left.source !== right.source) {
      return left.source === "legacy" ? -1 : 1;
    }
    return safeString(left.payCode).localeCompare(safeString(right.payCode));
  });
}

export function mapBiometricRowsForFusion(
  rows: Record<string, unknown>[]
): BiometricAttendanceGridRow[] {
  return rows.map((row) => ({
    ...mapBiometricAttendanceGridRow(row),
    source: "biometric" as AttendanceGridSource,
  }));
}
