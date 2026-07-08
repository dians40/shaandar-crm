import {
  assertPipelineTransition,
  INITIAL_INGEST_PIPELINE_STAGE,
  isPipelineStage,
  PIPELINE_STAGES,
  type PipelineStage,
} from "@/types/attendance-pipeline";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ATTENDANCE_STORAGE_BUCKET,
  ensureAttendanceStorageBucket,
} from "@/lib/attendance-storage-fallback";

const OVERLAY_MANIFEST_PATH = "pipeline-overlays/stages.json";

type OverlayManifest = Record<
  string,
  {
    pipelineStage: PipelineStage;
    workflowStage?: string;
    updatedAt: string;
  }
>;

function workflowStageForPipelineStage(stage: PipelineStage): string | undefined {
  if (stage === PIPELINE_STAGES.LAYER_3_WORKFLOW) return "pending_allocation";
  if (stage === PIPELINE_STAGES.LAYER_4_SAVED) return "finalized";
  if (stage === PIPELINE_STAGES.LAYER_4_ARCHIVED) return "archived";
  return undefined;
}

export function resolveOverlayPipelineStage(
  manifest: OverlayManifest,
  rowId: string
): PipelineStage {
  const token = manifest[rowId]?.pipelineStage ?? INITIAL_INGEST_PIPELINE_STAGE;
  return isPipelineStage(token) ? token : INITIAL_INGEST_PIPELINE_STAGE;
}

export function rowMatchesPipelineStage(
  manifest: OverlayManifest,
  rowId: string,
  stage: PipelineStage
): boolean {
  const resolved = resolveOverlayPipelineStage(manifest, rowId);
  if (stage === PIPELINE_STAGES.LAYER_2_STAGING) {
    return resolved === PIPELINE_STAGES.LAYER_2_STAGING;
  }
  return resolved === stage;
}

async function readOverlayManifest(supabase: SupabaseClient): Promise<OverlayManifest> {
  const { data, error } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .download(OVERLAY_MANIFEST_PATH);

  if (error || !data) return {};

  try {
    const parsed = JSON.parse(await data.text()) as OverlayManifest;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeOverlayManifest(
  supabase: SupabaseClient,
  manifest: OverlayManifest
): Promise<void> {
  const body = Buffer.from(JSON.stringify(manifest), "utf8");
  const { error } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .upload(OVERLAY_MANIFEST_PATH, body, {
      contentType: "application/json",
      upsert: true,
    });
  if (error) {
    throw new Error(`Pipeline overlay save failed: ${error.message}`);
  }
}

/** Load overlay manifest when SQL pipeline_stage column is unavailable. */
export async function loadPipelineStageOverlayManifest(
  supabase: SupabaseClient
): Promise<OverlayManifest> {
  await ensureAttendanceStorageBucket(supabase);
  return readOverlayManifest(supabase);
}

/** Transition rows via storage overlay when SQL pipeline_stage column is missing. */
export async function transitionOverlayPipelineStage(
  supabase: SupabaseClient,
  ids: string[],
  from: PipelineStage,
  to: PipelineStage
): Promise<number> {
  assertPipelineTransition(from, to);
  if (ids.length === 0) return 0;

  await ensureAttendanceStorageBucket(supabase);
  const manifest = await readOverlayManifest(supabase);
  const now = new Date().toISOString();
  let transitioned = 0;

  for (const id of ids) {
    const current = resolveOverlayPipelineStage(manifest, id);
    const matchesFrom =
      current === from ||
      (from === PIPELINE_STAGES.LAYER_2_STAGING &&
        current === INITIAL_INGEST_PIPELINE_STAGE &&
        !manifest[id]);
    if (!matchesFrom) continue;

    manifest[id] = {
      pipelineStage: to,
      workflowStage: workflowStageForPipelineStage(to),
      updatedAt: now,
    };
    transitioned += 1;
  }

  if (transitioned > 0) {
    await writeOverlayManifest(supabase, manifest);
  }

  return transitioned;
}

/** Copy overlay stages into SQL when pipeline_stage column becomes available. */
export async function syncOverlayManifestToSql(supabase: SupabaseClient): Promise<number> {
  const manifest = await readOverlayManifest(supabase);
  const entries = Object.entries(manifest);
  if (entries.length === 0) return 0;

  let synced = 0;
  for (const [id, entry] of entries) {
    const updatePayload: Record<string, unknown> = {
      pipeline_stage: entry.pipelineStage,
    };
    if (entry.workflowStage) {
      updatePayload.workflow_stage = entry.workflowStage;
    }
    const { error } = await supabase
      .from("biometric_attendance")
      .update(updatePayload)
      .eq("id", id);
    if (!error) synced += 1;
  }

  if (synced > 0) {
    await writeOverlayManifest(supabase, {});
  }

  return synced;
}

export async function removeOverlayPipelineStages(
  supabase: SupabaseClient,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  await ensureAttendanceStorageBucket(supabase);
  const manifest = await readOverlayManifest(supabase);
  let changed = false;
  for (const id of ids) {
    if (manifest[id]) {
      delete manifest[id];
      changed = true;
    }
  }
  if (changed) {
    await writeOverlayManifest(supabase, manifest);
  }
}
