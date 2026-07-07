import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import {
  ensureAttendanceTablesSchema,
  formatSchemaEnsureFailureMessage,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";
import {
  effectiveInTime,
  effectiveOutTime,
  mapAuditLogFromDb,
  mapStagingRowFromDb,
} from "@/lib/attendance-staging-mapper";
import {
  fetchStagingBootstrapFromBiometric,
  fetchStagingRowsViaPrisma,
} from "@/lib/attendance-prisma-fetch";
import type {
  AttendanceAuditLogEntry,
  AttendanceStagingRow,
} from "@/types/attendance-staging";

const STAGING_TABLE = "attendance_staging";
const AUDIT_TABLE = "attendance_audit_log";
const LOCAL_STAGING_KEY = "shaandar-crm-attendance-staging";
const LOCAL_AUDIT_KEY = "shaandar-crm-attendance-staging-audit";

function readLocalStaging(): AttendanceStagingRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STAGING_KEY);
    return raw ? (JSON.parse(raw) as AttendanceStagingRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocalStaging(rows: AttendanceStagingRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STAGING_KEY, JSON.stringify(rows));
}

function readLocalAudit(): AttendanceAuditLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AttendanceAuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocalAudit(entries: AttendanceAuditLogEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(entries));
}

function mapPayloadToLocalRow(
  payload: Record<string, unknown>,
  index: number
): AttendanceStagingRow {
  return {
    id: `staging-${Date.now()}-${index}`,
    employeeId: payload.employee_id ? String(payload.employee_id) : null,
    payCode: String(payload.pay_code ?? ""),
    employeeName: String(payload.employee_name ?? ""),
    date: String(payload.date ?? "").slice(0, 10),
    shiftDate: String(payload.shift_date ?? "").slice(0, 10),
    machineInTime: payload.machine_in_time ? String(payload.machine_in_time) : null,
    machineOutTime: payload.machine_out_time ? String(payload.machine_out_time) : null,
    correctedInTime: null,
    correctedOutTime: null,
    duration: String(payload.duration ?? ""),
    otHours: String(payload.ot_hours ?? ""),
    status: "Pending",
    isAnomaly: Boolean(payload.is_anomaly),
    anomalyReason: String(payload.anomaly_reason ?? ""),
    editRemark: "",
    isLocked: false,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function pushAuditEntry(
  audit: AttendanceAuditLogEntry[],
  input: {
    stagingId: string;
    changedBy: string;
    changeType: AttendanceAuditLogEntry["changeType"];
    remark?: string;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  }
): AttendanceAuditLogEntry[] {
  const entry: AttendanceAuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stagingId: input.stagingId,
    changedBy: input.changedBy,
    changeType: input.changeType,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    remark: input.remark ?? "",
    timestamp: new Date().toISOString(),
  };
  return [entry, ...audit];
}

function filterStagingRows(
  rows: AttendanceStagingRow[],
  filters?: { shiftDate?: string; status?: string }
): AttendanceStagingRow[] {
  let result = rows;
  if (filters?.shiftDate) {
    result = result.filter((row) => row.shiftDate === filters.shiftDate);
  }
  if (filters?.status) {
    result = result.filter((row) => row.status === filters.status);
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function loadStagingRowsResilient(filters?: {
  shiftDate?: string;
  status?: string;
}): Promise<AttendanceStagingRow[]> {
  await ensureAttendanceTablesSchema();

  const supabase = createAdminClient();
  let query = supabase.from(STAGING_TABLE).select("*").order("created_at", { ascending: false });
  if (filters?.shiftDate) query = query.eq("shift_date", filters.shiftDate);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query.limit(500);
  if (!error) {
    return (data ?? []).map((row) => mapStagingRowFromDb(row as Record<string, unknown>));
  }

  if (!isAttendanceSchemaError(error.message ?? "")) {
    throw new Error(error.message);
  }

  const prismaRows = await fetchStagingRowsViaPrisma(filters);
  if (prismaRows.length > 0) return prismaRows;

  return fetchStagingBootstrapFromBiometric(filters);
}

export async function fetchStagingRows(filters?: {
  shiftDate?: string;
  status?: string;
}): Promise<AttendanceStagingRow[]> {
  if (!isSupabaseServerConfigured()) {
    return filterStagingRows(readLocalStaging(), filters);
  }

  return loadStagingRowsResilient(filters);
}

async function assertStagingSchemaReady(): Promise<void> {
  if (!isSupabaseServerConfigured()) return;

  const ensure = await ensureAttendanceTablesSchema();
  if (!ensure.ok) {
    throw new Error(formatSchemaEnsureFailureMessage());
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from(STAGING_TABLE).select("id").limit(1);
  if (error && isAttendanceSchemaError(error.message ?? "")) {
    throw new Error(formatSchemaEnsureFailureMessage());
  }
  if (error) throw new Error(error.message);
}

export async function insertStagingRows(
  payloads: Record<string, unknown>[],
  auditMeta: { changedBy: string; remark?: string }
): Promise<{ saved: number; rows: AttendanceStagingRow[] }> {
  if (payloads.length === 0) return { saved: 0, rows: [] };

  if (!isSupabaseServerConfigured()) {
    const inserted = payloads.map(mapPayloadToLocalRow);
    writeLocalStaging([...inserted, ...readLocalStaging()]);
    return { saved: inserted.length, rows: inserted };
  }

  await assertStagingSchemaReady();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(STAGING_TABLE)
    .upsert(payloads, { onConflict: "pay_code,shift_date" })
    .select("*");

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => mapStagingRowFromDb(row as Record<string, unknown>));
  for (const row of rows) {
    await appendAuditLog({
      stagingId: row.id,
      changedBy: auditMeta.changedBy,
      changeType: "Upload",
      remark: auditMeta.remark ?? "Excel upload to staging",
      newValue: { payCode: row.payCode, shiftDate: row.shiftDate },
    });
  }
  return { saved: rows.length, rows };
}

export async function appendAuditLog(input: {
  stagingId: string;
  changedBy: string;
  changeType: AttendanceAuditLogEntry["changeType"];
  remark?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}): Promise<void> {
  if (!isSupabaseServerConfigured()) {
    writeLocalAudit(pushAuditEntry(readLocalAudit(), input));
    return;
  }

  await assertStagingSchemaReady();

  const supabase = createAdminClient();
  const { error } = await supabase.from(AUDIT_TABLE).insert({
    staging_id: input.stagingId,
    changed_by: input.changedBy,
    change_type: input.changeType,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    remark: input.remark ?? "",
  });
  if (error) throw new Error(error.message);
}

export async function updateStagingEdit(input: {
  id: string;
  correctedInTime?: string | null;
  correctedOutTime?: string | null;
  editRemark: string;
  changedBy: string;
}): Promise<AttendanceStagingRow> {
  if (!input.editRemark.trim()) throw new Error("Edit remark is required.");

  if (!isSupabaseServerConfigured()) {
    const rows = readLocalStaging();
    const index = rows.findIndex((r) => r.id === input.id);
    if (index < 0) throw new Error("Staging row not found.");
    if (rows[index].isLocked) throw new Error("Approved records are locked.");
    const old = { ...rows[index] };
    rows[index] = {
      ...rows[index],
      correctedInTime: input.correctedInTime ?? rows[index].correctedInTime,
      correctedOutTime: input.correctedOutTime ?? rows[index].correctedOutTime,
      editRemark: input.editRemark,
      updatedAt: new Date().toISOString(),
    };
    writeLocalStaging(rows);
    writeLocalAudit(
      pushAuditEntry(readLocalAudit(), {
        stagingId: input.id,
        changedBy: input.changedBy,
        changeType: "Edit",
        remark: input.editRemark,
        oldValue: old as unknown as Record<string, unknown>,
        newValue: rows[index] as unknown as Record<string, unknown>,
      })
    );
    return rows[index];
  }

  await assertStagingSchemaReady();

  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from(STAGING_TABLE)
    .select("*")
    .eq("id", input.id)
    .single();
  if (fetchError || !existing) throw new Error("Staging row not found.");
  if (existing.is_locked) throw new Error("Approved records are locked.");

  const { data, error } = await supabase
    .from(STAGING_TABLE)
    .update({
      corrected_in_time: input.correctedInTime ?? existing.corrected_in_time,
      corrected_out_time: input.correctedOutTime ?? existing.corrected_out_time,
      edit_remark: input.editRemark,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await appendAuditLog({
    stagingId: input.id,
    changedBy: input.changedBy,
    changeType: "Edit",
    remark: input.editRemark,
    oldValue: existing as Record<string, unknown>,
    newValue: data as Record<string, unknown>,
  });
  return mapStagingRowFromDb(data as Record<string, unknown>);
}

export async function approveStagingRow(input: {
  id: string;
  approvedBy: string;
}): Promise<AttendanceStagingRow> {
  if (!isSupabaseServerConfigured()) {
    const rows = readLocalStaging();
    const index = rows.findIndex((r) => r.id === input.id);
    if (index < 0) throw new Error("Staging row not found.");
    rows[index] = {
      ...rows[index],
      status: "Approved",
      isLocked: true,
      approvedBy: input.approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeLocalStaging(rows);
    writeLocalAudit(
      pushAuditEntry(readLocalAudit(), {
        stagingId: input.id,
        changedBy: input.approvedBy,
        changeType: "Approve",
        remark: "Single row approved",
      })
    );
    return rows[index];
  }

  await assertStagingSchemaReady();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(STAGING_TABLE)
    .update({
      status: "Approved",
      is_locked: true,
      approved_by: input.approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("is_locked", false)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await appendAuditLog({
    stagingId: input.id,
    changedBy: input.approvedBy,
    changeType: "Approve",
    remark: "Single row approved",
  });
  return mapStagingRowFromDb(data as Record<string, unknown>);
}

export async function approveAllStaging(input: {
  shiftDate?: string;
  approvedBy: string;
}): Promise<{ approved: number; skipped: number }> {
  const rows = await fetchStagingRows({ shiftDate: input.shiftDate, status: "Pending" });
  let approved = 0;
  let skipped = 0;
  for (const row of rows) {
    if (row.isLocked) {
      skipped += 1;
      continue;
    }
    try {
      await approveStagingRow({ id: row.id, approvedBy: input.approvedBy });
      approved += 1;
    } catch {
      skipped += 1;
    }
  }
  return { approved, skipped };
}

export async function upsertEveningStaging(
  payloads: Record<string, unknown>[],
  changedBy: string
): Promise<{ updated: number; inserted: number }> {
  let updated = 0;
  let inserted = 0;

  for (const payload of payloads) {
    const payCode = String(payload.pay_code ?? "");
    const shiftDate = String(payload.shift_date ?? "").slice(0, 10);
    const existing = (await fetchStagingRows({ shiftDate })).find(
      (r) => r.payCode === payCode && r.shiftDate === shiftDate
    );

    if (existing?.isLocked) continue;

    if (existing) {
      if (!isSupabaseServerConfigured()) {
        const rows = readLocalStaging();
        const idx = rows.findIndex((r) => r.id === existing.id);
        if (idx >= 0) {
          rows[idx] = {
            ...rows[idx],
            machineOutTime: payload.machine_out_time
              ? String(payload.machine_out_time)
              : rows[idx].machineOutTime,
            duration: String(payload.duration ?? rows[idx].duration),
            otHours: String(payload.ot_hours ?? rows[idx].otHours),
            updatedAt: new Date().toISOString(),
          };
          writeLocalStaging(rows);
        }
        updated += 1;
      } else {
        await assertStagingSchemaReady();
        const supabase = createAdminClient();
        await supabase
          .from(STAGING_TABLE)
          .update({
            machine_out_time: payload.machine_out_time ?? existing.machineOutTime,
            duration: payload.duration ?? existing.duration,
            ot_hours: payload.ot_hours ?? existing.otHours,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        updated += 1;
      }
    } else {
      await insertStagingRows(
        [
          {
            ...payload,
            is_anomaly: true,
            anomaly_reason: "Late entry — new row from evening upload",
          },
        ],
        { changedBy, remark: "Evening upsert — new employee" }
      );
      inserted += 1;
    }
  }

  return { updated, inserted };
}

export async function transferApprovedToMaster(input: {
  shiftDate: string;
  transferredBy: string;
}): Promise<{ transferred: number }> {
  const rows = await fetchStagingRows({ shiftDate: input.shiftDate, status: "Approved" });
  if (rows.length === 0) return { transferred: 0 };

  if (!isSupabaseServerConfigured()) {
    return { transferred: rows.length };
  }

  await assertStagingSchemaReady();

  const supabase = createAdminClient();
  let transferred = 0;

  for (const row of rows) {
    if (!row.employeeId) continue;
    const { error } = await supabase.from("employee_attendance").upsert(
      {
        employee_id: row.employeeId,
        attendance_date: row.date,
        pay_code: row.payCode,
        status: "present",
        final_in_time: effectiveInTime(row),
        final_out_time: effectiveOutTime(row),
        net_hours: row.duration,
        ot_hours: row.otHours,
        approved_by: row.approvedBy ?? input.transferredBy,
        approved_at: row.approvedAt ?? new Date().toISOString(),
        notes: JSON.stringify({ source: "attendance_staging", stagingId: row.id }),
      },
      { onConflict: "employee_id,attendance_date" }
    );
    if (error) {
      if (isAttendanceSchemaError(error.message ?? "")) {
        throw new Error(formatSchemaEnsureFailureMessage(error.message));
      }
      continue;
    }
    transferred += 1;
    await appendAuditLog({
      stagingId: row.id,
      changedBy: input.transferredBy,
      changeType: "Transfer",
      remark: "Final transfer to employee_attendance",
    });
  }

  return { transferred };
}

export async function fetchAuditLog(stagingId: string): Promise<AttendanceAuditLogEntry[]> {
  if (!isSupabaseServerConfigured()) {
    return readLocalAudit().filter((e) => e.stagingId === stagingId);
  }

  await assertStagingSchemaReady();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(AUDIT_TABLE)
    .select("*")
    .eq("staging_id", stagingId)
    .order("timestamp", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapAuditLogFromDb(row as Record<string, unknown>));
}
