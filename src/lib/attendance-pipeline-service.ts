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
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";
import { fetchStorageGridRows } from "@/lib/attendance-storage-fallback";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";

const BIOMETRIC_TABLE = "biometric_attendance";

function resolveRowPipelineStage(row: Record<string, unknown>): PipelineStage {
  const token = String(row.pipeline_stage ?? row.pipelineStage ?? INITIAL_INGEST_PIPELINE_STAGE);
  return isPipelineStage(token) ? token : INITIAL_INGEST_PIPELINE_STAGE;
}

async function fetchRowsByPipelineStageSupabase(
  stage: PipelineStage,
  options: { limit?: number; date?: string; search?: string } = {}
): Promise<BiometricAttendanceGridRow[]> {
  const supabase = createAdminClient();
  const limit = options.limit ?? 500;
  const normalizedDate = options.date ? normalizeAttendanceDateIso(options.date) : undefined;
  const searchToken = options.search?.trim();

  let query = supabase
    .from(BIOMETRIC_TABLE)
    .select("*")
    .eq("pipeline_stage", stage)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (normalizedDate) query = query.eq("date", normalizedDate);
  if (searchToken) {
    const pattern = `%${searchToken}%`;
    query = query.or(`employee_name.ilike.${pattern},pay_code.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapBiometricAttendanceGridRow(row as Record<string, unknown>));
}

async function fetchRowsByPipelineStageStorage(
  stage: PipelineStage,
  options: { limit?: number; date?: string; search?: string } = {}
): Promise<BiometricAttendanceGridRow[]> {
  if (!isSupabaseServerConfigured()) return [];
  const supabase = createAdminClient();
  const all = await fetchStorageGridRows(supabase, options);
  return all.filter((row) => {
    const raw = row as BiometricAttendanceGridRow & { pipelineStage?: string };
    return (raw.pipelineStage ?? INITIAL_INGEST_PIPELINE_STAGE) === stage;
  });
}

/** Query biometric rows for exactly one pipeline layer — no cross-layer leakage. */
export async function fetchRowsByPipelineStage(
  stage: PipelineStage,
  options: { limit?: number; date?: string; search?: string } = {}
): Promise<BiometricAttendanceGridRow[]> {
  if (!isPipelineStage(stage)) throw new Error(`Invalid pipeline stage: ${stage}`);

  if (isSupabaseServerConfigured()) {
    await ensureAttendanceTablesSchema();
    try {
      const sqlRows = await fetchRowsByPipelineStageSupabase(stage, options);
      if (sqlRows.length > 0) return sqlRows;
    } catch (error) {
      console.warn("[pipeline] supabase fetch failed:", error);
    }
  }

  if (stage === PIPELINE_STAGES.LAYER_2_STAGING) {
    const storageRows = await fetchRowsByPipelineStageStorage(stage, options);
    if (storageRows.length > 0) return storageRows;
  }

  const prismaRows = await fetchBiometricGridViaPrisma(options.limit ?? 500, options.date, options.search);
  return prismaRows.filter((row) => {
    const token = (row as BiometricAttendanceGridRow & { pipelineStage?: string }).pipelineStage;
    return (token ?? INITIAL_INGEST_PIPELINE_STAGE) === stage;
  });
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

  const supabase = createAdminClient();
  const updatePayload: Record<string, unknown> = { pipeline_stage: to };
  if (to === PIPELINE_STAGES.LAYER_3_WORKFLOW) {
    updatePayload.workflow_stage = "pending_allocation";
  }
  if (to === PIPELINE_STAGES.LAYER_4_SAVED) {
    updatePayload.workflow_stage = "finalized";
  }

  const { data, error } = await supabase
    .from(BIOMETRIC_TABLE)
    .update(updatePayload)
    .in("id", ids)
    .eq("pipeline_stage", from)
    .select("id");

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
  await ensureAttendanceTablesSchema();
  const transitioned = await transitionRowsSupabase(input.ids, input.from, input.to);
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

export { INITIAL_INGEST_PIPELINE_STAGE, PIPELINE_STAGES, resolveRowPipelineStage };
