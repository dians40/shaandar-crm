import type { SupabaseClient } from "@supabase/supabase-js";
import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import { isAttendanceSchemaError } from "@/lib/attendance-schema-ensure";
import type { AttendanceDateCatalogEntry } from "@/lib/attendance-date-catalog";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";

export const ATTENDANCE_STORAGE_BUCKET = "attendance-imports";

export type AttendanceStorageBatch = {
  version: 1;
  savedAt: string;
  reportDate: string;
  rows: Record<string, unknown>[];
  biometricCount: number;
  workflowCount: number;
};

function storageImportPrefix(reportDate: string): string {
  return `imports/${reportDate}`;
}

/** Create private bucket when SQL tables are unavailable — works with service role only. */
export async function ensureAttendanceStorageBucket(
  supabase: SupabaseClient
): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Storage bucket list failed: ${listError.message}`);
  }

  if (buckets?.some((bucket) => bucket.name === ATTENDANCE_STORAGE_BUCKET)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    ATTENDANCE_STORAGE_BUCKET,
    { public: false, fileSizeLimit: 52_428_800 }
  );

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Storage bucket create failed: ${createError.message}`);
  }
}

/** Persist bulk import JSON when public.employee_attendance / biometric_attendance are missing. */
export async function saveBulkImportToStorage(
  supabase: SupabaseClient,
  input: {
    reportDate: string;
    rows: Record<string, unknown>[];
    workflowCount?: number;
  }
): Promise<{ saved: number; storagePath: string; reportDate: string }> {
  await ensureAttendanceStorageBucket(supabase);

  const reportDate =
    normalizeAttendanceDateIso(input.reportDate) ||
    normalizeAttendanceDateIso(String(input.rows[0]?.date ?? "")) ||
    new Date().toISOString().slice(0, 10);

  const payload: AttendanceStorageBatch = {
    version: 1,
    savedAt: new Date().toISOString(),
    reportDate,
    rows: input.rows,
    biometricCount: input.rows.length,
    workflowCount: input.workflowCount ?? 0,
  };

  const storagePath = `${storageImportPrefix(reportDate)}/batch-${Date.now()}.json`;
  const body = Buffer.from(JSON.stringify(payload), "utf8");

  const { error } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .upload(storagePath, body, {
      contentType: "application/json",
      upsert: false,
    });

  if (error) {
    throw new Error(`Cloud storage save failed: ${error.message}`);
  }

  return { saved: input.rows.length, storagePath, reportDate };
}

async function downloadStorageBatch(
  supabase: SupabaseClient,
  path: string
): Promise<AttendanceStorageBatch | null> {
  const { data, error } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .download(path);

  if (error || !data) return null;

  try {
    const parsed = JSON.parse(await data.text()) as AttendanceStorageBatch;
    if (!Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function rowMatchesFilters(
  row: Record<string, unknown>,
  date?: string,
  search?: string
): boolean {
  const normalizedDate = date ? normalizeAttendanceDateIso(date) : "";
  const rowDate = normalizeAttendanceDateIso(
    String(row.date ?? row.attendance_date ?? "")
  );

  if (normalizedDate && rowDate !== normalizedDate) return false;

  if (search?.trim()) {
    const token = search.trim().toLowerCase();
    const name = String(row.employee_name ?? row.employeeName ?? "").toLowerCase();
    const payCode = String(row.pay_code ?? row.payCode ?? "").toLowerCase();
    if (!name.includes(token) && !payCode.includes(token)) return false;
  }

  return true;
}

/** Load grid rows from cloud storage batches (fallback when SQL tables missing). */
export async function fetchStorageGridRows(
  supabase: SupabaseClient,
  options: { limit?: number; date?: string; search?: string } = {}
): Promise<BiometricAttendanceGridRow[]> {
  const limit = options.limit ?? 300;

  try {
    await ensureAttendanceStorageBucket(supabase);
  } catch {
    return [];
  }

  const { data: dateFolders, error: listError } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .list("imports", { limit: 200, sortBy: { column: "name", order: "desc" } });

  if (listError || !dateFolders?.length) return [];

  const targetDates = options.date
    ? [normalizeAttendanceDateIso(options.date)]
    : dateFolders
        .filter((entry) => entry.id == null || !entry.name.endsWith(".json"))
        .map((entry) => normalizeAttendanceDateIso(entry.name))
        .filter(Boolean);

  const merged: BiometricAttendanceGridRow[] = [];

  for (const reportDate of targetDates) {
    if (!reportDate) continue;

    const { data: batchFiles, error: batchError } = await supabase.storage
      .from(ATTENDANCE_STORAGE_BUCKET)
      .list(storageImportPrefix(reportDate), {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (batchError || !batchFiles?.length) continue;

    for (const file of batchFiles) {
      if (!file.name.endsWith(".json")) continue;
      const batch = await downloadStorageBatch(
        supabase,
        `${storageImportPrefix(reportDate)}/${file.name}`
      );
      if (!batch) continue;

      for (const row of batch.rows) {
        if (!rowMatchesFilters(row, options.date, options.search)) continue;
        merged.push({
          ...mapBiometricAttendanceGridRow({
            ...row,
            id: `storage-${reportDate}-${merged.length}`,
            source: "storage",
          }),
          source: "biometric" as const,
        });
        if (merged.length >= limit) return merged;
      }
    }
  }

  return merged;
}

/** Distinct saved dates from cloud storage batches. */
export async function fetchStorageDateCatalog(
  supabase: SupabaseClient
): Promise<AttendanceDateCatalogEntry[]> {
  try {
    await ensureAttendanceStorageBucket(supabase);
  } catch {
    return [];
  }

  const { data: dateFolders, error } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .list("imports", { limit: 200, sortBy: { column: "name", order: "desc" } });

  if (error || !dateFolders?.length) return [];

  const catalog: AttendanceDateCatalogEntry[] = [];

  for (const folder of dateFolders) {
    if (folder.name.endsWith(".json")) continue;
    const date = normalizeAttendanceDateIso(folder.name);
    if (!date) continue;

    const { data: batchFiles } = await supabase.storage
      .from(ATTENDANCE_STORAGE_BUCKET)
      .list(storageImportPrefix(date), { limit: 100 });

    let rowCount = 0;
    for (const file of batchFiles ?? []) {
      if (!file.name.endsWith(".json")) continue;
      const batch = await downloadStorageBatch(
        supabase,
        `${storageImportPrefix(date)}/${file.name}`
      );
      rowCount += batch?.rows.length ?? 0;
    }

    if (rowCount > 0) {
      catalog.push({
        date,
        biometricCount: rowCount,
        legacyCount: 0,
        totalCount: rowCount,
      });
    }
  }

  return catalog.sort((left, right) => right.date.localeCompare(left.date));
}

export function isStorageFallbackError(message: string): boolean {
  return isAttendanceSchemaError(message);
}

/** True when cloud storage bucket is available for attendance saves (no SQL DDL needed). */
export async function checkAttendanceStorageReady(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    await ensureAttendanceStorageBucket(supabase);
    return true;
  } catch {
    return false;
  }
}
