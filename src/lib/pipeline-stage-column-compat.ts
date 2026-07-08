import {
  isPipelineStageColumnError,
} from "@/lib/attendance-schema-ensure";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";

let columnAvailableCache: boolean | null = null;

export function resetPipelineStageColumnCache(): void {
  columnAvailableCache = null;
}

/** Probe PostgREST for biometric_attendance.pipeline_stage (cached per process). */
export async function isPipelineStageColumnAvailable(): Promise<boolean> {
  if (!isSupabaseServerConfigured()) {
    columnAvailableCache = false;
    return false;
  }

  if (columnAvailableCache !== null) return columnAvailableCache;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("biometric_attendance")
      .select("pipeline_stage")
      .limit(1);
    if (error && isPipelineStageColumnError(error.message ?? "")) {
      columnAvailableCache = false;
      return false;
    }
    columnAvailableCache = true;
    return true;
  } catch {
    columnAvailableCache = false;
    return false;
  }
}

export function omitPipelineStageFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  delete next.pipeline_stage;
  delete next.pipelineStage;
  delete next.workflow_stage;
  delete next.workflowStage;
  return next;
}

export function withOptionalPipelineStageFields(
  row: Record<string, unknown>,
  includePipelineFields: boolean
): Record<string, unknown> {
  if (includePipelineFields) return row;
  return omitPipelineStageFields(row);
}
