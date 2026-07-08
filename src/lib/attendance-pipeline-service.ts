import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import { mapGridRowToStagingRow, mapStagingRowToWorkflowRecord } from "@/lib/attendance-staging-mapper";
import { fetchBiometricGridViaPrisma } from "@/lib/attendance-prisma-fetch";
import {
  assertPipelineTransition,
  INITIAL_INGEST_PIPELINE_STAGE,
  isPipelineStage,
  PIPELINE_STAGES,
  type PipelineStage,
} from "@/types/attendance-pipeline";
import type { AttendanceStagingRow } from "@/types/attendance-staging";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import type { AttendanceWorkflowRecord } from "@/types/attendance-workflow";
import {
  ensureAttendanceTablesSchema,
  ensurePipelineStageColumn,
  backfillMissingPipelineStages,
  isAttendanceSchemaError,
  reloadPostgrestSchemaCache,
} from "@/lib/attendance-schema-ensure";
import {
  isPipelineStageColumnAvailable,
  isPipelineStageUnavailableMessage,
  resetPipelineStageColumnCache,
} from "@/lib/pipeline-stage-column-compat";
import {
  loadPipelineStageOverlayManifest,
  removeOverlayPipelineStages,
  syncOverlayManifestToSql,
  transitionOverlayPipelineStage,
  type OverlayManifest,
} from "@/lib/pipeline-stage-overlay-compat";
import {
  filterRowsByEffectivePipelineStage,
  syncRemarkStagesToSql,
  transitionRemarkPipelineStage,
  encodeRemarkPipelineStage,
  parseRemarkPipelineStage,
} from "@/lib/pipeline-stage-remark-compat";
import {
  fetchStorageGridRows,
  transitionStoragePipelineStage,
  updateStorageRowFields,
} from "@/lib/attendance-storage-fallback";
import type { AttendancePipelineFetchOptions } from "@/lib/attendance-pipeline-fetch-options";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";

const BIOMETRIC_TABLE = "biometric_attendance";

function resolveRowPipelineStage(row: Record<string, unknown>): PipelineStage {
  const token = String(row.pipeline_stage ?? row.pipelineStage ?? INITIAL_INGEST_PIPELINE_STAGE);
  return isPipelineStage(token) ? token : INITIAL_INGEST_PIPELINE_STAGE;
}

async function fetchRowsByPipelineStageSupabase(
  stage: PipelineStage,
  options: AttendancePipelineFetchOptions = {}
): Promise<BiometricAttendanceGridRow[]> {
  const supabase = createAdminClient();
  const limit = options.limit ?? 500;
  const normalizedDate = options.date ? normalizeAttendanceDateIso(options.date) : undefined;
  const fromDate = options.fromDate ? normalizeAttendanceDateIso(options.fromDate) : undefined;
  const toDate = options.toDate ? normalizeAttendanceDateIso(options.toDate) : undefined;
  const searchToken = options.search?.trim();
  const departmentToken = options.department?.trim();
  const designationToken = options.designation?.trim();
  const pipelineColumnReady = await isPipelineStageColumnAvailable();

  let query = supabase
    .from(BIOMETRIC_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (pipelineColumnReady) {
    query = query.or(`pipeline_stage.eq.${stage},pipeline_stage.is.null`);
  }

  if (normalizedDate) query = query.eq("date", normalizedDate);
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  if (departmentToken) query = query.eq("department", departmentToken);
  if (designationToken) query = query.eq("designation", designationToken);
  if (searchToken) {
    const pattern = `%${searchToken}%`;
    query = query.or(`employee_name.ilike.${pattern},pay_code.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    const message = error.message ?? "Pipeline fetch failed.";
    if (isPipelineStageUnavailableMessage(message) && pipelineColumnReady) {
      resetPipelineStageColumnCache();
      return fetchRowsByPipelineStageSupabase(stage, options);
    }
    if (isAttendanceSchemaError(message)) return [];
    throw new Error(message);
  }

  const rawRows = (data ?? []) as Record<string, unknown>[];
  const mapped = rawRows.map((row) => mapBiometricAttendanceGridRow(row));
  const pairs = rawRows.map((raw, index) => ({ raw, row: mapped[index] }));

  let manifest: OverlayManifest = {};
  try {
    manifest = await loadPipelineStageOverlayManifest(supabase);
  } catch (error) {
    console.warn("[pipeline] overlay manifest load failed:", error);
  }

  return filterRowsByEffectivePipelineStage(manifest, pairs, stage, pipelineColumnReady);
}

async function fetchRowsByPipelineStageStorage(
  stage: PipelineStage,
  options: AttendancePipelineFetchOptions = {}
): Promise<BiometricAttendanceGridRow[]> {
  if (!isSupabaseServerConfigured()) return [];
  const supabase = createAdminClient();
  const all = await fetchStorageGridRows(supabase, { ...options, pipelineStage: stage });
  return all;
}

function filterRowsByDateRange(
  rows: BiometricAttendanceGridRow[],
  fromDate?: string,
  toDate?: string
): BiometricAttendanceGridRow[] {
  if (!fromDate && !toDate) return rows;
  const from = fromDate ? normalizeAttendanceDateIso(fromDate) : "";
  const to = toDate ? normalizeAttendanceDateIso(toDate) : "";
  return rows.filter((row) => {
    const date = normalizeAttendanceDateIso(row.date);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

function filterRowsByDepartmentDesignation(
  rows: BiometricAttendanceGridRow[],
  department?: string,
  designation?: string
): BiometricAttendanceGridRow[] {
  const departmentToken = department?.trim();
  const designationToken = designation?.trim();
  if (!departmentToken && !designationToken) return rows;

  return rows.filter((row) => {
    if (departmentToken && String(row.department ?? "").trim() !== departmentToken) return false;
    if (designationToken && String(row.designation ?? "").trim() !== designationToken) return false;
    return true;
  });
}

/** Query biometric rows for exactly one pipeline layer — no cross-layer leakage. */
export async function fetchRowsByPipelineStage(
  stage: PipelineStage,
  options: AttendancePipelineFetchOptions = {}
): Promise<BiometricAttendanceGridRow[]> {
  if (!isPipelineStage(stage)) throw new Error(`Invalid pipeline stage: ${stage}`);

  if (isSupabaseServerConfigured()) {
    resetPipelineStageColumnCache();
    if (await isPipelineStageColumnAvailable()) {
      await ensurePipelineStageColumn();
      await backfillMissingPipelineStages();
    }
    try {
      return await fetchRowsByPipelineStageSupabase(stage, options);
    } catch (error) {
      console.warn("[pipeline] supabase fetch failed:", error);
    }
  }

  const storageRows = await fetchRowsByPipelineStageStorage(stage, options);
  if (storageRows.length > 0) {
    return filterRowsByDepartmentDesignation(
      filterRowsByDateRange(storageRows, options.fromDate, options.toDate),
      options.department,
      options.designation
    );
  }

  const prismaRows = await fetchBiometricGridViaPrisma(
    options.limit ?? 500,
    options.date,
    options.search,
    options.department,
    options.designation
  );
  return filterRowsByDepartmentDesignation(
    filterRowsByDateRange(
      prismaRows.filter((row) => {
        const token = (row as BiometricAttendanceGridRow & { pipelineStage?: string }).pipelineStage;
        return (token ?? INITIAL_INGEST_PIPELINE_STAGE) === stage;
      }),
      options.fromDate,
      options.toDate
    ),
    options.department,
    options.designation
  );
}

export function gridRowsToStagingRows(rows: BiometricAttendanceGridRow[]): AttendanceStagingRow[] {
  return rows.map((row, index) => mapGridRowToStagingRow(row, index));
}

export function gridRowsToWorkflowRecords(rows: BiometricAttendanceGridRow[]): AttendanceWorkflowRecord[] {
  return gridRowsToStagingRows(rows).map((row) => mapStagingRowToWorkflowRecord(row));
}

async function transitionRowsSupabase(
  ids: string[],
  from: PipelineStage,
  to: PipelineStage
): Promise<number> {
  assertPipelineTransition(from, to);
  if (ids.length === 0) return 0;

  if (!(await isPipelineStageColumnAvailable())) {
    return 0;
  }

  const supabase = createAdminClient();
  const updatePayload: Record<string, unknown> = { pipeline_stage: to };
  if (to === PIPELINE_STAGES.LAYER_3_WORKFLOW) {
    updatePayload.workflow_stage = "pending_allocation";
  }
  if (to === PIPELINE_STAGES.LAYER_4_SAVED) {
    updatePayload.workflow_stage = "finalized";
  }
  if (to === PIPELINE_STAGES.LAYER_4_ARCHIVED) {
    updatePayload.workflow_stage = "archived";
  }

  let updateQuery = supabase
    .from(BIOMETRIC_TABLE)
    .update(updatePayload)
    .in("id", ids);

  if (from === PIPELINE_STAGES.LAYER_2_STAGING) {
    updateQuery = updateQuery.or(`pipeline_stage.eq.${from},pipeline_stage.is.null`);
  } else {
    updateQuery = updateQuery.eq("pipeline_stage", from);
  }

  const { data, error } = await updateQuery.select("id");

  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) {
      throw new Error("Pipeline transition failed — SQL tables not ready.");
    }
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function transitionPipelineStage(input: {
  ids: string[];
  from: PipelineStage;
  to: PipelineStage;
}): Promise<{ transitioned: number }> {
  if (!isSupabaseServerConfigured()) {
    throw new Error("Database not configured for pipeline transitions.");
  }

  try {
    await ensureAttendanceTablesSchema();
  } catch (error) {
    console.warn("[pipeline] ensureAttendanceTablesSchema failed:", error);
  }

  resetPipelineStageColumnCache();
  try {
    if (!(await isPipelineStageColumnAvailable())) {
      await ensurePipelineStageColumn();
      await reloadPostgrestSchemaCache();
      resetPipelineStageColumnCache();
    }
  } catch (error) {
    console.warn("[pipeline] pipeline_stage ensure during transition failed:", error);
    resetPipelineStageColumnCache();
  }

  const pipelineColumnReady = await isPipelineStageColumnAvailable();
  if (pipelineColumnReady) {
    try {
      await syncOverlayManifestToSql(createAdminClient());
      await syncRemarkStagesToSql(createAdminClient());
    } catch (error) {
      console.warn("[pipeline] compat stage sync failed:", error);
    }
    await backfillMissingPipelineStages();
  }

  let transitioned = 0;
  if (pipelineColumnReady) {
    try {
      transitioned = await transitionRowsSupabase(input.ids, input.from, input.to);
    } catch (error) {
      console.warn("[pipeline] SQL transition failed, trying overlay/storage:", error);
    }
  }

  if (transitioned === 0 && !pipelineColumnReady) {
    try {
      const supabase = createAdminClient();
      transitioned = await transitionOverlayPipelineStage(
        supabase,
        input.ids,
        input.from,
        input.to
      );
    } catch (error) {
      console.warn("[pipeline] overlay transition failed:", error);
    }
  }

  if (transitioned === 0 && !pipelineColumnReady) {
    try {
      const supabase = createAdminClient();
      transitioned = await transitionRemarkPipelineStage(
        supabase,
        input.ids,
        input.from,
        input.to
      );
    } catch (error) {
      console.warn("[pipeline] remark transition failed:", error);
    }
  }

  if (transitioned === 0) {
    try {
      const supabase = createAdminClient();
      transitioned = await transitionStoragePipelineStage(
        supabase,
        input.ids,
        input.from,
        input.to
      );
    } catch (error) {
      console.warn("[pipeline] storage batch transition failed:", error);
    }
  }

  if (transitioned === 0 && input.ids.length > 0) {
    if (!pipelineColumnReady) {
      throw new Error(
        "Pipeline transition failed. Run migration 013 in Supabase SQL Editor (/api/v1/attendance/schema/migration-sql?file=013), or enable Supabase Storage for the attendance-imports bucket."
      );
    }
    throw new Error(
      `No rows transitioned from ${input.from} to ${input.to}. Verify records exist at the current layer.`
    );
  }

  return { transitioned };
}

export async function approveStagingToWorkflow(ids: string[]): Promise<{ transitioned: number }> {
  return transitionPipelineStage({
    ids,
    from: PIPELINE_STAGES.LAYER_2_STAGING,
    to: PIPELINE_STAGES.LAYER_3_WORKFLOW,
  });
}

export async function commitWorkflowToSaved(ids: string[]): Promise<{ transitioned: number }> {
  return transitionPipelineStage({
    ids,
    from: PIPELINE_STAGES.LAYER_3_WORKFLOW,
    to: PIPELINE_STAGES.LAYER_4_SAVED,
  });
}

export async function updatePipelineRowFields(input: {
  ids: string[];
  stage: PipelineStage;
  department?: string;
  designation?: string;
}): Promise<{ updated: number }> {
  const { ids, stage } = input;
  if (ids.length === 0) return { updated: 0 };

  const updatePayload: Record<string, unknown> = {};
  if (input.department !== undefined) updatePayload.department = input.department.trim();
  if (input.designation !== undefined) updatePayload.designation = input.designation.trim();
  if (Object.keys(updatePayload).length === 0) return { updated: 0 };

  let updated = 0;
  if (isSupabaseServerConfigured()) {
    await ensureAttendanceTablesSchema();
    const pipelineColumnReady = await isPipelineStageColumnAvailable();
    try {
      const supabase = createAdminClient();
      let updateQuery = supabase
        .from(BIOMETRIC_TABLE)
        .update(updatePayload)
        .in("id", ids);
      if (pipelineColumnReady) {
        updateQuery = updateQuery.eq("pipeline_stage", stage);
      }
      const { data, error } = await updateQuery.select("id");
      if (error) {
        if (isPipelineStageUnavailableMessage(error.message ?? "")) {
          resetPipelineStageColumnCache();
          const { data: retryData, error: retryError } = await supabase
            .from(BIOMETRIC_TABLE)
            .update(updatePayload)
            .in("id", ids)
            .select("id");
          if (!retryError) updated = retryData?.length ?? 0;
        }
      } else {
        updated = data?.length ?? 0;
      }
    } catch (error) {
      console.warn("[pipeline] SQL field update failed:", error);
    }
  }

  if (updated === 0 && isSupabaseServerConfigured()) {
    const supabase = createAdminClient();
    updated = await updateStorageRowFields(supabase, ids, stage, {
      department: input.department,
      designation: input.designation,
    });
  }

  if (updated === 0 && ids.length > 0) {
    throw new Error(`Field update failed — verify records exist at ${stage}.`);
  }

  return { updated };
}

export async function updateStagingDepartment(
  ids: string[],
  department: string
): Promise<{ updated: number }> {
  return updatePipelineRowFields({
    ids,
    stage: PIPELINE_STAGES.LAYER_2_STAGING,
    department,
  });
}

export async function updateStagingDesignation(
  ids: string[],
  designation: string
): Promise<{ updated: number }> {
  return updatePipelineRowFields({
    ids,
    stage: PIPELINE_STAGES.LAYER_2_STAGING,
    designation,
  });
}

/** Layer 2 edit — persists in/out times and remark on biometric_attendance at LAYER_2_STAGING. */
export async function updatePipelineStagingEdit(input: {
  id: string;
  inTime?: string | null;
  outTime?: string | null;
  remark: string;
}): Promise<{ updated: number }> {
  const id = input.id.trim();
  if (!id) throw new Error("Row id is required.");

  const remark = input.remark.trim();
  if (!remark) throw new Error("Edit remark is required.");

  let updated = 0;
  if (isSupabaseServerConfigured()) {
    const pipelineColumnReady = await isPipelineStageColumnAvailable();
    if (pipelineColumnReady) {
      await ensurePipelineStageColumn();
    }
    try {
      const supabase = createAdminClient();
      let remarkToSave = remark;
      if (!pipelineColumnReady) {
        const { data: existing } = await supabase
          .from(BIOMETRIC_TABLE)
          .select("remark")
          .eq("id", id)
          .maybeSingle();
        const stage =
          parseRemarkPipelineStage(String(existing?.remark ?? "")) ??
          PIPELINE_STAGES.LAYER_2_STAGING;
        remarkToSave = encodeRemarkPipelineStage(stage, remark);
      }

      const updatePayload: Record<string, unknown> = { remark: remarkToSave };
      if (input.inTime !== undefined) updatePayload.in_time = input.inTime || null;
      if (input.outTime !== undefined) updatePayload.out_time = input.outTime || null;

      let updateQuery = supabase
        .from(BIOMETRIC_TABLE)
        .update(updatePayload)
        .eq("id", id);
      if (pipelineColumnReady) {
        updateQuery = updateQuery.or(
          `pipeline_stage.eq.${PIPELINE_STAGES.LAYER_2_STAGING},pipeline_stage.is.null`
        );
      }
      const { data, error } = await updateQuery.select("id");
      if (error) {
        if (isPipelineStageUnavailableMessage(error.message ?? "")) {
          resetPipelineStageColumnCache();
          const { data: retryData, error: retryError } = await supabase
            .from(BIOMETRIC_TABLE)
            .update(updatePayload)
            .eq("id", id)
            .select("id");
          if (!retryError) updated = retryData?.length ?? 0;
        } else {
          throw new Error(error.message ?? "Layer 2 edit failed.");
        }
      } else {
        updated = data?.length ?? 0;
      }
    } catch (error) {
      if (!isPipelineStageUnavailableMessage(error instanceof Error ? error.message : "")) {
        console.warn("[pipeline] SQL staging edit failed:", error);
      }
    }
  }

  if (updated === 0 && isSupabaseServerConfigured()) {
    const supabase = createAdminClient();
    const { updateStorageStagingEdit } = await import("@/lib/attendance-storage-fallback");
    updated = await updateStorageStagingEdit(supabase, id, {
      inTime: input.inTime,
      outTime: input.outTime,
      remark,
    });
  }

  if (updated === 0) {
    throw new Error("Edit failed — verify the record exists at LAYER_2_STAGING.");
  }

  return { updated };
}

export async function persistSavedRow(id: string): Promise<{ ok: boolean; archived: boolean }> {
  if (!id.trim()) throw new Error("Row id is required.");

  const result = await transitionPipelineStage({
    ids: [id],
    from: PIPELINE_STAGES.LAYER_4_SAVED,
    to: PIPELINE_STAGES.LAYER_4_ARCHIVED,
  });
  return { ok: result.transitioned > 0, archived: result.transitioned > 0 };
}

export async function persistSavedRows(ids: string[]): Promise<{ saved: number }> {
  let saved = 0;
  for (const id of ids) {
    try {
      const result = await persistSavedRow(id);
      if (result.ok) saved += 1;
    } catch {
      // continue with remaining rows
    }
  }
  return { saved };
}

export async function rejectPipelineRows(input: {
  ids: string[];
  stage: PipelineStage;
}): Promise<{ rejected: number }> {
  if (input.ids.length === 0) return { rejected: 0 };
  if (!isSupabaseServerConfigured()) {
    throw new Error("Database not configured for pipeline rejection.");
  }
  await ensureAttendanceTablesSchema();

  const pipelineColumnReady = await isPipelineStageColumnAvailable();
  const supabase = createAdminClient();
  let deleteQuery = supabase.from(BIOMETRIC_TABLE).delete().in("id", input.ids);
  if (pipelineColumnReady) {
    deleteQuery = deleteQuery.eq("pipeline_stage", input.stage);
  }
  const { data, error } = await deleteQuery.select("id");

  if (error) {
    if (isPipelineStageUnavailableMessage(error.message ?? "")) {
      resetPipelineStageColumnCache();
      const { data: retryData, error: retryError } = await supabase
        .from(BIOMETRIC_TABLE)
        .delete()
        .in("id", input.ids)
        .select("id");
      if (retryError) {
        throw new Error("Pipeline rejection failed — could not delete rows.");
      }
      const rejected = retryData?.length ?? 0;
      if (rejected > 0) {
        await removeOverlayPipelineStages(supabase, input.ids);
      }
      return { rejected };
    }
    if (isAttendanceSchemaError(error.message ?? "")) {
      throw new Error("Pipeline rejection failed — SQL tables not ready.");
    }
    throw new Error(error.message);
  }

  const rejected = data?.length ?? 0;
  if (rejected > 0 && !pipelineColumnReady) {
    await removeOverlayPipelineStages(supabase, input.ids);
  }
  return { rejected };
}

export { INITIAL_INGEST_PIPELINE_STAGE, PIPELINE_STAGES, resolveRowPipelineStage };
