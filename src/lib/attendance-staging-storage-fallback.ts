import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceAuditLogEntry,
  AttendanceStagingRow,
} from "@/types/attendance-staging";

export const STAGING_STORAGE_BUCKET = "attendance-staging-data";
const STATE_PATH = "workflow/state.json";

export type StagingWorkflowState = {
  version: 1;
  updatedAt: string;
  rows: AttendanceStagingRow[];
  audit: AttendanceAuditLogEntry[];
};

export async function ensureStagingStorageBucket(
  supabase: SupabaseClient
): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === STAGING_STORAGE_BUCKET)) return;

  const { error } = await supabase.storage.createBucket(STAGING_STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 52_428_800,
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Staging storage bucket create failed: ${error.message}`);
  }
}

export async function loadStagingWorkflowState(
  supabase: SupabaseClient
): Promise<StagingWorkflowState> {
  await ensureStagingStorageBucket(supabase);
  const { data, error } = await supabase.storage
    .from(STAGING_STORAGE_BUCKET)
    .download(STATE_PATH);

  if (error || !data) {
    return { version: 1, updatedAt: new Date().toISOString(), rows: [], audit: [] };
  }

  try {
    const parsed = JSON.parse(await data.text()) as StagingWorkflowState;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), rows: [], audit: [] };
  }
}

export async function saveStagingWorkflowState(
  supabase: SupabaseClient,
  state: StagingWorkflowState
): Promise<void> {
  await ensureStagingStorageBucket(supabase);
  const payload = {
    ...state,
    version: 1 as const,
    updatedAt: new Date().toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const { error } = await supabase.storage
    .from(STAGING_STORAGE_BUCKET)
    .upload(STATE_PATH, body, { contentType: "application/json", upsert: true });
  if (error) throw new Error(`Staging cloud save failed: ${error.message}`);
}

export function filterStagingRows(
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

export async function saveMasterTransferSnapshot(
  supabase: SupabaseClient,
  shiftDate: string,
  rows: AttendanceStagingRow[]
): Promise<number> {
  await ensureStagingStorageBucket(supabase);
  const path = `master-transfers/${shiftDate}/approved-${Date.now()}.json`;
  const body = Buffer.from(
    JSON.stringify({ version: 1, shiftDate, transferredAt: new Date().toISOString(), rows }),
    "utf8"
  );
  const { error } = await supabase.storage
    .from(STAGING_STORAGE_BUCKET)
    .upload(path, body, { contentType: "application/json", upsert: false });
  if (error) throw new Error(`Master transfer snapshot failed: ${error.message}`);
  return rows.length;
}
