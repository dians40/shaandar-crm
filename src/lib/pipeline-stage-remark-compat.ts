import {
  INITIAL_INGEST_PIPELINE_STAGE,
  isPipelineStage,
  PIPELINE_STAGES,
  type PipelineStage,
} from "@/types/attendance-pipeline";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import type { OverlayManifest } from "@/lib/pipeline-stage-overlay-compat";

const REMARK_STAGE_PATTERN = /^__PIPELINE:([A-Z0-9_]+)__(?:\|(.*))?$/;

export function parseRemarkPipelineStage(remark: string | null | undefined): PipelineStage | null {
  const match = String(remark ?? "").match(REMARK_STAGE_PATTERN);
  if (!match) return null;
  const token = match[1];
  return isPipelineStage(token) ? token : null;
}

export function extractUserRemarkFromPipelineRemark(remark: string | null | undefined): string {
  const match = String(remark ?? "").match(REMARK_STAGE_PATTERN);
  return match?.[2]?.trim() ?? String(remark ?? "").trim();
}

export function encodeRemarkPipelineStage(
  stage: PipelineStage,
  userRemark?: string | null
): string {
  const trimmed = userRemark?.trim();
  return trimmed
    ? `__PIPELINE:${stage}__|${trimmed}`
    : `__PIPELINE:${stage}__`;
}

export function resolveCompatPipelineStage(
  manifest: OverlayManifest,
  row: Pick<BiometricAttendanceGridRow, "id" | "remark">
): PipelineStage {
  const overlayStage = manifest[row.id]?.pipelineStage;
  if (overlayStage && isPipelineStage(overlayStage)) return overlayStage;

  const remarkStage = parseRemarkPipelineStage(row.remark);
  if (remarkStage) return remarkStage;

  return INITIAL_INGEST_PIPELINE_STAGE;
}

export function filterRowsByCompatPipelineStage(
  manifest: OverlayManifest,
  rows: BiometricAttendanceGridRow[],
  stage: PipelineStage
): BiometricAttendanceGridRow[] {
  return rows.filter((row) => resolveCompatPipelineStage(manifest, row) === stage);
}

/** Persist layer transitions in remark when pipeline_stage column and storage overlay are unavailable. */
export async function transitionRemarkPipelineStage(
  supabase: SupabaseClient,
  ids: string[],
  from: PipelineStage,
  to: PipelineStage,
  table = "biometric_attendance"
): Promise<number> {
  if (ids.length === 0) return 0;

  const { data: rows, error } = await supabase
    .from(table)
    .select("id, remark")
    .in("id", ids);

  if (error || !rows?.length) {
    if (error) console.warn("[pipeline-remark] fetch failed:", error.message);
    return 0;
  }

  let transitioned = 0;
  for (const row of rows) {
    const current =
      parseRemarkPipelineStage(String(row.remark ?? "")) ?? INITIAL_INGEST_PIPELINE_STAGE;
    const matchesFrom =
      current === from ||
      (from === PIPELINE_STAGES.LAYER_2_STAGING && current === INITIAL_INGEST_PIPELINE_STAGE);
    if (!matchesFrom) continue;

    const userRemark = extractUserRemarkFromPipelineRemark(String(row.remark ?? ""));
    const { error: updateError } = await supabase
      .from(table)
      .update({ remark: encodeRemarkPipelineStage(to, userRemark) })
      .eq("id", row.id);

    if (!updateError) transitioned += 1;
  }

  return transitioned;
}

/** Copy remark-encoded stages into SQL pipeline_stage after migration 013. */
export async function syncRemarkStagesToSql(
  supabase: SupabaseClient,
  table = "biometric_attendance"
): Promise<number> {
  const { data: rows, error } = await supabase.from(table).select("id, remark").limit(2000);
  if (error || !rows?.length) return 0;

  let synced = 0;
  for (const row of rows) {
    const stage = parseRemarkPipelineStage(String(row.remark ?? ""));
    if (!stage) continue;

    const updatePayload: Record<string, unknown> = { pipeline_stage: stage };
    if (stage === PIPELINE_STAGES.LAYER_3_WORKFLOW) {
      updatePayload.workflow_stage = "pending_allocation";
    }
    if (stage === PIPELINE_STAGES.LAYER_4_SAVED) {
      updatePayload.workflow_stage = "finalized";
    }

    const { error: updateError } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", row.id);
    if (!updateError) synced += 1;
  }

  return synced;
}
