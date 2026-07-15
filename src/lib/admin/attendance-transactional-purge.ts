/**
 * V19 — Isolated transactional attendance purge (no UI / pipeline code changes).
 * Clears imported attendance rows only; preserves employees, departments, designations.
 */

import { ATTENDANCE_STORAGE_BUCKET } from "@/lib/attendance-storage-fallback";
import { OVERLAY_MANIFEST_STORAGE_PATH } from "@/lib/admin/attendance-purge-paths";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ATTENDANCE_PURGE_CONFIRM_TOKEN = "PURGE_ATTENDANCE_TRANSACTIONAL_V19" as const;

const TRANSACTIONAL_TABLES = [
  "attendance_audit_log",
  "attendance_staging",
  "biometric_attendance",
  "employee_attendance",
] as const;

export type AttendancePurgeResult = {
  ok: boolean;
  message: string;
  tables: Record<string, number>;
  storageObjectsRemoved: number;
  overlayRemoved: boolean;
};

function isMissingTableError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("does not exist") || lower.includes("could not find the table");
}

async function deleteAllRows(
  supabase: SupabaseClient,
  table: string
): Promise<number> {
  const { count, error: countError } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (countError) {
    if (isMissingTableError(countError.message ?? "")) return 0;
    throw new Error(`${table}: ${countError.message}`);
  }

  if (!count || count === 0) return 0;

  const { error } = await supabase
    .from(table)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    if (isMissingTableError(error.message ?? "")) return 0;
    throw new Error(`${table}: ${error.message}`);
  }

  return count;
}

async function purgeStorageImports(supabase: SupabaseClient): Promise<number> {
  let removed = 0;

  const { data: rootList, error: rootError } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .list("imports", { limit: 500 });

  if (rootError || !rootList?.length) return 0;

  for (const entry of rootList) {
    const prefix = `imports/${entry.name}`;
    const { data: files, error: listError } = await supabase.storage
      .from(ATTENDANCE_STORAGE_BUCKET)
      .list(prefix, { limit: 200 });

    if (listError) continue;

    const paths =
      files
        ?.filter((file) => file.name.endsWith(".json"))
        .map((file) => `${prefix}/${file.name}`) ?? [];

    if (paths.length === 0) {
      if (!entry.name.endsWith(".json")) continue;
      paths.push(prefix);
    }

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(ATTENDANCE_STORAGE_BUCKET)
        .remove(paths);
      if (!removeError) removed += paths.length;
    }
  }

  return removed;
}

async function removePipelineOverlay(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.storage
    .from(ATTENDANCE_STORAGE_BUCKET)
    .remove([OVERLAY_MANIFEST_STORAGE_PATH]);
  return !error;
}

/** Purge all transactional attendance/import rows — master config untouched. */
export async function purgeAttendanceTransactionalData(): Promise<AttendancePurgeResult> {
  if (!isSupabaseServerConfigured()) {
    return {
      ok: false,
      message: "Supabase not configured — cannot purge remote attendance data.",
      tables: {},
      storageObjectsRemoved: 0,
      overlayRemoved: false,
    };
  }

  const supabase = createAdminClient();
  const tables: Record<string, number> = {};

  for (const table of TRANSACTIONAL_TABLES) {
    tables[table] = await deleteAllRows(supabase, table);
  }

  const storageObjectsRemoved = await purgeStorageImports(supabase);
  const overlayRemoved = await removePipelineOverlay(supabase);

  const totalRows = Object.values(tables).reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    message:
      totalRows > 0 || storageObjectsRemoved > 0
        ? `Purged ${totalRows} SQL row(s) and ${storageObjectsRemoved} storage batch file(s). Master departments/designations preserved.`
        : "No transactional attendance rows found — database already clean.",
    tables,
    storageObjectsRemoved,
    overlayRemoved,
  };
}
