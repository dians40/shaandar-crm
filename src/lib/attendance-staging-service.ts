import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import {
  ensureAttendanceTablesSchema,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";
import {
  effectiveInTime,
  effectiveOutTime,
  mapAuditLogFromDb,
  mapStagingRowFromDb,
} from "@/lib/attendance-staging-mapper";
import {
  filterStagingRows,
  loadStagingWorkflowState,
  saveMasterTransferSnapshot,
  saveStagingWorkflowState,
} from "@/lib/attendance-staging-storage-fallback";
import type {
  AttendanceAuditLogEntry,
  AttendanceStagingRow,
} from "@/types/attendance-staging";

const STAGING_TABLE = "attendance_staging";
const AUDIT_TABLE = "attendance_audit_log";
const LOCAL_STAGING_KEY = "shaandar-crm-attendance-staging";
const LOCAL_AUDIT_KEY = "shaandar-crm-attendance-staging-audit";

type StagingMode = "sql" | "storage" | "local";

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

function payloadToStagingRow(
  payload: Record<string, unknown>,
  index: number,
  existingId?: string
): AttendanceStagingRow {
  return {
    id: existingId ?? `staging-${Date.now()}-${index}`,
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

async function resolveStagingMode(): Promise<StagingMode> {
  if (!isSupabaseServerConfigured()) return "local";

  await ensureAttendanceTablesSchema();

  const supabase = createAdminClient();
  const { error } = await supabase.from(STAGING_TABLE).select("id").limit(1);
  if (!error) return "sql";
  // Missing table or schema-cache errors → cloud storage fallback (migration 012 optional).
  if (isAttendanceSchemaError(error.message ?? "")) return "storage";
  return "storage";
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

async function insertStagingRowsIntoStorage(
  payloads: Record<string, unknown>[],
  auditMeta: { changedBy: string; remark?: string }
): Promise<{ saved: number; rows: AttendanceStagingRow[]; storageFallback: true }> {
  const supabase = createAdminClient();
  const state = await loadStagingWorkflowState(supabase);
  const inserted: AttendanceStagingRow[] = [];

  for (let index = 0; index < payloads.length; index += 1) {
    const payload = payloads[index];
    const payCode = String(payload.pay_code ?? "");
    const shiftDate = String(payload.shift_date ?? "").slice(0, 10);
    const existingIndex = state.rows.findIndex(
      (row) => row.payCode === payCode && row.shiftDate === shiftDate && !row.isLocked
    );
    const row =
      existingIndex >= 0
        ? {
            ...state.rows[existingIndex],
            ...payloadToStagingRow(payload, index, state.rows[existingIndex].id),
            status: "Pending" as const,
            isLocked: false,
          }
        : payloadToStagingRow(payload, index);
    if (existingIndex >= 0) state.rows[existingIndex] = row;
    else state.rows.unshift(row);
    inserted.push(row);
    state.audit = pushAuditEntry(state.audit, {
      stagingId: row.id,
      changedBy: auditMeta.changedBy,
      changeType: "Upload",
      remark: auditMeta.remark ?? "Excel upload to staging (cloud)",
      newValue: { payCode: row.payCode, shiftDate: row.shiftDate },
    });
  }

  await saveStagingWorkflowState(supabase, state);
  return { saved: inserted.length, rows: inserted, storageFallback: true };
}

export async function fetchStagingRows(filters?: {
  shiftDate?: string;
  status?: string;
}): Promise<AttendanceStagingRow[]> {
  const mode = await resolveStagingMode();

  if (mode === "local") {
    return filterStagingRows(readLocalStaging(), filters);
  }

  if (mode === "storage") {
    const supabase = createAdminClient();
    const state = await loadStagingWorkflowState(supabase);
    return filterStagingRows(state.rows, filters);
  }

  const supabase = createAdminClient();
  let query = supabase.from(STAGING_TABLE).select("*").order("created_at", { ascending: false });
  if (filters?.shiftDate) query = query.eq("shift_date", filters.shiftDate);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query.limit(500);
  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) {
      const state = await loadStagingWorkflowState(supabase);
      return filterStagingRows(state.rows, filters);
    }
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapStagingRowFromDb(row as Record<string, unknown>));
}

export async function insertStagingRows(
  payloads: Record<string, unknown>[],
  auditMeta: { changedBy: string; remark?: string }
): Promise<{ saved: number; rows: AttendanceStagingRow[]; storageFallback?: boolean }> {
  if (payloads.length === 0) return { saved: 0, rows: [] };

  const mode = await resolveStagingMode();

  if (mode === "local") {
    const inserted = payloads.map(mapPayloadToLocalRow);
    writeLocalStaging([...inserted, ...readLocalStaging()]);
    return { saved: inserted.length, rows: inserted };
  }

  if (mode === "storage") {
    return insertStagingRowsIntoStorage(payloads, auditMeta);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(STAGING_TABLE)
    .upsert(payloads, { onConflict: "pay_code,shift_date" })
    .select("*");

  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) {
      return insertStagingRowsIntoStorage(payloads, auditMeta);
    }
    throw new Error(error.message);
  }

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
  const mode = await resolveStagingMode();

  if (mode === "local") {
    writeLocalAudit(
      pushAuditEntry(readLocalAudit(), input)
    );
    return;
  }

  if (mode === "storage") {
    const supabase = createAdminClient();
    const state = await loadStagingWorkflowState(supabase);
    state.audit = pushAuditEntry(state.audit, input);
    await saveStagingWorkflowState(supabase, state);
    return;
  }

  const supabase = createAdminClient();
  await supabase.from(AUDIT_TABLE).insert({
    staging_id: input.stagingId,
    changed_by: input.changedBy,
    change_type: input.changeType,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    remark: input.remark ?? "",
  });
}

export async function updateStagingEdit(input: {
  id: string;
  correctedInTime?: string | null;
  correctedOutTime?: string | null;
  editRemark: string;
  changedBy: string;
}): Promise<AttendanceStagingRow> {
  if (!input.editRemark.trim()) throw new Error("Edit remark is required.");

  const mode = await resolveStagingMode();

  if (mode === "local") {
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

  if (mode === "storage") {
    const supabase = createAdminClient();
    const state = await loadStagingWorkflowState(supabase);
    const index = state.rows.findIndex((r) => r.id === input.id);
    if (index < 0) throw new Error("Staging row not found.");
    if (state.rows[index].isLocked) throw new Error("Approved records are locked.");
    const old = { ...state.rows[index] };
    state.rows[index] = {
      ...state.rows[index],
      correctedInTime: input.correctedInTime ?? state.rows[index].correctedInTime,
      correctedOutTime: input.correctedOutTime ?? state.rows[index].correctedOutTime,
      editRemark: input.editRemark,
      updatedAt: new Date().toISOString(),
    };
    state.audit = pushAuditEntry(state.audit, {
      stagingId: input.id,
      changedBy: input.changedBy,
      changeType: "Edit",
      remark: input.editRemark,
      oldValue: old as unknown as Record<string, unknown>,
      newValue: state.rows[index] as unknown as Record<string, unknown>,
    });
    await saveStagingWorkflowState(supabase, state);
    return state.rows[index];
  }

  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from(STAGING_TABLE)
    .select("*")
    .eq("id", input.id)
    .single();
  if (fetchError && isAttendanceSchemaError(fetchError.message ?? "")) {
    const state = await loadStagingWorkflowState(supabase);
    const index = state.rows.findIndex((r) => r.id === input.id);
    if (index < 0) throw new Error("Staging row not found.");
    if (state.rows[index].isLocked) throw new Error("Approved records are locked.");
    const old = { ...state.rows[index] };
    state.rows[index] = {
      ...state.rows[index],
      correctedInTime: input.correctedInTime ?? state.rows[index].correctedInTime,
      correctedOutTime: input.correctedOutTime ?? state.rows[index].correctedOutTime,
      editRemark: input.editRemark,
      updatedAt: new Date().toISOString(),
    };
    state.audit = pushAuditEntry(state.audit, {
      stagingId: input.id,
      changedBy: input.changedBy,
      changeType: "Edit",
      remark: input.editRemark,
      oldValue: old as unknown as Record<string, unknown>,
      newValue: state.rows[index] as unknown as Record<string, unknown>,
    });
    await saveStagingWorkflowState(supabase, state);
    return state.rows[index];
  }
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
  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) {
      const state = await loadStagingWorkflowState(supabase);
      const index = state.rows.findIndex((r) => r.id === input.id);
      if (index < 0) throw new Error("Staging row not found.");
      if (state.rows[index].isLocked) throw new Error("Approved records are locked.");
      const old = { ...state.rows[index] };
      state.rows[index] = {
        ...state.rows[index],
        correctedInTime: input.correctedInTime ?? state.rows[index].correctedInTime,
        correctedOutTime: input.correctedOutTime ?? state.rows[index].correctedOutTime,
        editRemark: input.editRemark,
        updatedAt: new Date().toISOString(),
      };
      state.audit = pushAuditEntry(state.audit, {
        stagingId: input.id,
        changedBy: input.changedBy,
        changeType: "Edit",
        remark: input.editRemark,
        oldValue: old as unknown as Record<string, unknown>,
        newValue: state.rows[index] as unknown as Record<string, unknown>,
      });
      await saveStagingWorkflowState(supabase, state);
      return state.rows[index];
    }
    throw new Error(error.message);
  }

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
  const mode = await resolveStagingMode();

  if (mode === "local") {
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

  if (mode === "storage") {
    const supabase = createAdminClient();
    const state = await loadStagingWorkflowState(supabase);
    const index = state.rows.findIndex((r) => r.id === input.id);
    if (index < 0) throw new Error("Staging row not found.");
    if (state.rows[index].isLocked) throw new Error("Already approved.");
    state.rows[index] = {
      ...state.rows[index],
      status: "Approved",
      isLocked: true,
      approvedBy: input.approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.audit = pushAuditEntry(state.audit, {
      stagingId: input.id,
      changedBy: input.approvedBy,
      changeType: "Approve",
      remark: "Single row approved (cloud staging)",
    });
    await saveStagingWorkflowState(supabase, state);
    return state.rows[index];
  }

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
  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) {
      const supabase = createAdminClient();
      const state = await loadStagingWorkflowState(supabase);
      const index = state.rows.findIndex((r) => r.id === input.id);
      if (index < 0) throw new Error("Staging row not found.");
      if (state.rows[index].isLocked) throw new Error("Already approved.");
      state.rows[index] = {
        ...state.rows[index],
        status: "Approved",
        isLocked: true,
        approvedBy: input.approvedBy,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.audit = pushAuditEntry(state.audit, {
        stagingId: input.id,
        changedBy: input.approvedBy,
        changeType: "Approve",
        remark: "Single row approved (cloud staging fallback)",
      });
      await saveStagingWorkflowState(supabase, state);
      return state.rows[index];
    }
    throw new Error(error.message);
  }

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
}): Promise<{ approved: number; skipped: number; storageFallback?: boolean }> {
  const mode = await resolveStagingMode();
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
  return {
    approved,
    skipped,
    storageFallback: mode === "storage",
  };
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
      const mode = await resolveStagingMode();
      if (mode === "storage") {
        const supabase = createAdminClient();
        const state = await loadStagingWorkflowState(supabase);
        const idx = state.rows.findIndex((r) => r.id === existing.id);
        if (idx >= 0) {
          state.rows[idx] = {
            ...state.rows[idx],
            machineOutTime: payload.machine_out_time
              ? String(payload.machine_out_time)
              : state.rows[idx].machineOutTime,
            duration: String(payload.duration ?? state.rows[idx].duration),
            otHours: String(payload.ot_hours ?? state.rows[idx].otHours),
            updatedAt: new Date().toISOString(),
          };
          await saveStagingWorkflowState(supabase, state);
        }
        updated += 1;
      } else if (mode === "local") {
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
}): Promise<{ transferred: number; storageFallback?: boolean }> {
  const mode = await resolveStagingMode();
  const rows = await fetchStagingRows({ shiftDate: input.shiftDate, status: "Approved" });

  if (rows.length === 0) return { transferred: 0 };

  if (mode === "local") {
    return { transferred: rows.length };
  }

  if (mode === "storage") {
    const supabase = createAdminClient();
    const transferred = await saveMasterTransferSnapshot(supabase, input.shiftDate, rows);
    const state = await loadStagingWorkflowState(supabase);
    for (const row of rows) {
      state.audit = pushAuditEntry(state.audit, {
        stagingId: row.id,
        changedBy: input.transferredBy,
        changeType: "Transfer",
        remark: "Transferred to master snapshot (cloud — SQL tables pending migration 012)",
      });
    }
    await saveStagingWorkflowState(supabase, state);
    return { transferred, storageFallback: true };
  }

  const supabase = createAdminClient();
  let transferred = 0;
  let schemaBlocked = false;

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
        schemaBlocked = true;
        break;
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

  if (schemaBlocked || (transferred === 0 && rows.length > 0)) {
    const snapshotCount = await saveMasterTransferSnapshot(supabase, input.shiftDate, rows);
    const state = await loadStagingWorkflowState(supabase);
    for (const row of rows) {
      state.audit = pushAuditEntry(state.audit, {
        stagingId: row.id,
        changedBy: input.transferredBy,
        changeType: "Transfer",
        remark:
          "Transferred to master snapshot (cloud — run migration 012 for SQL tables)",
      });
    }
    await saveStagingWorkflowState(supabase, state);
    return { transferred: snapshotCount, storageFallback: true };
  }

  return { transferred };
}

export async function fetchAuditLog(stagingId: string): Promise<AttendanceAuditLogEntry[]> {
  const mode = await resolveStagingMode();

  if (mode === "local") {
    return readLocalAudit().filter((e) => e.stagingId === stagingId);
  }

  if (mode === "storage") {
    const supabase = createAdminClient();
    const state = await loadStagingWorkflowState(supabase);
    return state.audit.filter((e) => e.stagingId === stagingId);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(AUDIT_TABLE)
    .select("*")
    .eq("staging_id", stagingId)
    .order("timestamp", { ascending: false });
  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) {
      const state = await loadStagingWorkflowState(supabase);
      return state.audit.filter((e) => e.stagingId === stagingId);
    }
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapAuditLogFromDb(row as Record<string, unknown>));
}
