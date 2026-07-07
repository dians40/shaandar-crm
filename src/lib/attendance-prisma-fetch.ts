import type { Prisma } from "@prisma/client";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import { mapStagingRowFromDb } from "@/lib/attendance-staging-mapper";
import type { AttendanceStagingRow } from "@/types/attendance-staging";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import { INITIAL_INGEST_PIPELINE_STAGE } from "@/types/attendance-pipeline";

function isoDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return normalizeAttendanceDateIso(String(value));
}

function mapPrismaStagingRow(row: {
  id: string;
  employeeId: string | null;
  payCode: string;
  employeeName: string | null;
  date: Date;
  shiftDate: Date;
  machineInTime: Date | null;
  machineOutTime: Date | null;
  correctedInTime: Date | null;
  correctedOutTime: Date | null;
  duration: string | null;
  otHours: string | null;
  status: string;
  isAnomaly: boolean;
  anomalyReason: string | null;
  editRemark: string | null;
  isLocked: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AttendanceStagingRow {
  return mapStagingRowFromDb({
    id: row.id,
    employee_id: row.employeeId,
    pay_code: row.payCode,
    employee_name: row.employeeName,
    date: isoDate(row.date),
    shift_date: isoDate(row.shiftDate),
    machine_in_time: row.machineInTime?.toISOString() ?? null,
    machine_out_time: row.machineOutTime?.toISOString() ?? null,
    corrected_in_time: row.correctedInTime?.toISOString() ?? null,
    corrected_out_time: row.correctedOutTime?.toISOString() ?? null,
    duration: row.duration,
    ot_hours: row.otHours,
    status: row.status,
    is_anomaly: row.isAnomaly,
    anomaly_reason: row.anomalyReason,
    edit_remark: row.editRemark,
    is_locked: row.isLocked,
    approved_by: row.approvedBy,
    approved_at: row.approvedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  });
}

export function mapBiometricPrismaRowToStagingRow(row: {
  id: string;
  payCode: string | null;
  employeeName: string | null;
  department: string | null;
  designation: string | null;
  date: string | null;
  inTime: string | null;
  outTime: string | null;
  duration: string | null;
  otHours: string | null;
  status: string | null;
  remark: string | null;
  createdAt: Date | null;
}): AttendanceStagingRow {
  const date = normalizeAttendanceDateIso(row.date ?? "");
  const createdAt = row.createdAt?.toISOString() ?? new Date().toISOString();
  return {
    id: `bio-${row.id}`,
    employeeId: null,
    payCode: row.payCode ?? "",
    employeeName: row.employeeName ?? "",
    date,
    shiftDate: date,
    machineInTime: row.inTime,
    machineOutTime: row.outTime,
    correctedInTime: null,
    correctedOutTime: null,
    duration: row.duration ?? "",
    otHours: row.otHours ?? "",
    status: "Pending",
    isAnomaly: false,
    anomalyReason: "",
    editRemark: row.remark ?? "",
    department: row.department ?? "",
    designation: row.designation ?? "",
    isLocked: false,
    approvedBy: null,
    approvedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function fetchStagingRowsViaPrisma(filters?: {
  shiftDate?: string;
  status?: string;
}): Promise<AttendanceStagingRow[]> {
  if (!isPrismaConfigured() || !prisma) return [];

  const where: Prisma.AttendanceStagingWhereInput = {};
  if (filters?.shiftDate) {
    where.shiftDate = new Date(filters.shiftDate);
  }
  if (filters?.status) {
    where.status = filters.status;
  }

  try {
    const rows = await prisma.attendanceStaging.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return rows.map(mapPrismaStagingRow);
  } catch (error) {
    console.warn("[attendance-staging] prisma staging fetch failed:", error);
    return [];
  }
}

export async function fetchStagingBootstrapFromBiometric(filters?: {
  shiftDate?: string;
  status?: string;
}): Promise<AttendanceStagingRow[]> {
  if (filters?.status && filters.status !== "Pending") return [];

  if (isPrismaConfigured() && prisma) {
    try {
      const where: Prisma.BiometricAttendanceWhereInput = {};
      if (filters?.shiftDate) {
        where.date = filters.shiftDate;
      }
      const rows = await prisma.biometricAttendance.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      if (rows.length > 0) {
        return rows.map(mapBiometricPrismaRowToStagingRow);
      }
    } catch (error) {
      console.warn("[attendance-staging] prisma biometric bootstrap failed:", error);
    }
  }

  return [];
}

export async function fetchBiometricGridViaPrisma(
  limit: number,
  date?: string,
  search?: string
) {
  if (!isPrismaConfigured() || !prisma) return [];

  const where: Prisma.BiometricAttendanceWhereInput = {};
  if (date) {
    where.date = normalizeAttendanceDateIso(date);
  }
  if (search?.trim()) {
    where.OR = [
      { employeeName: { contains: search.trim(), mode: "insensitive" } },
      { payCode: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  try {
    const rows = await prisma.biometricAttendance.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) =>
      mapBiometricAttendanceGridRow({
        id: row.id,
        srl_no: row.srlNo,
        pay_code: row.payCode,
        card_no: row.cardNo,
        employee_name: row.employeeName,
        department: row.department,
        designation: row.designation,
        shift: row.shift,
        date: row.date,
        status: row.status,
        in_time: row.inTime,
        out_time: row.outTime,
        duration: row.duration,
        early_in: row.earlyIn,
        late_in: row.lateIn,
        early_out: row.earlyOut,
        late_out: row.lateOut,
        ot_hours: row.otHours,
        short_hours: row.shortHours,
        gross_hours: row.grossHours,
        net_hours: row.netHours,
        work_code: row.workCode,
        remark: row.remark,
        created_at: row.createdAt?.toISOString(),
        pipeline_stage: row.pipelineStage ?? INITIAL_INGEST_PIPELINE_STAGE,
      })
    );
  } catch (error) {
    console.warn("[attendance/biometric] prisma findMany failed:", error);
    return [];
  }
}
