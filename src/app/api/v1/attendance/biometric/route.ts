import { NextResponse } from "next/server";
import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import { fetchAttendanceDateCatalog } from "@/lib/attendance-date-catalog";
import { fetchLegacyAttendanceGridRows } from "@/lib/legacy-attendance-fetch";
import { mergeAttendanceGridRows } from "@/lib/legacy-attendance-grid-fusion";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import { fetchBiometricGridViaPrisma } from "@/lib/attendance-prisma-fetch";
import { fetchStorageGridRows } from "@/lib/attendance-storage-fallback";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureAttendanceTablesSchema,
  formatSchemaEnsureFailureMessage,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";

const BIOMETRIC_TABLE = "biometric_attendance";
const MAX_MERGED_ROWS = 500;

function normalizeDateFilter(date?: string): string | undefined {
  return date ? normalizeAttendanceDateIso(date) : undefined;
}

/** Supabase raw select — reads legacy + canonical biometric columns from the same table. */
async function fetchBiometricGridRowsSupabase(
  limit: number,
  date?: string,
  search?: string
): Promise<BiometricAttendanceGridRow[]> {
  const supabase = createAdminClient();
  const normalizedDate = normalizeDateFilter(date);
  const searchToken = search?.trim();

  let query = supabase
    .from(BIOMETRIC_TABLE)
    .select("*")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (normalizedDate) {
    query = query.or(
      `date.eq.${normalizedDate},attendance_date.eq.${normalizedDate}`
    );
  }

  if (searchToken) {
    const pattern = `%${searchToken}%`;
    query = query.or(`employee_name.ilike.${pattern},pay_code.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    if (isAttendanceSchemaError(error.message ?? "")) {
      throw new Error(formatSchemaEnsureFailureMessage(error.message));
    }
    throw new Error(error.message);
  }

  let rows = data ?? [];

  if (normalizedDate && searchToken) {
    const token = searchToken.toLowerCase();
    rows = rows.filter((row) => {
      const rowDate = normalizeAttendanceDateIso(
        String(row.date ?? row.attendance_date ?? "")
      );
      if (rowDate !== normalizedDate) return false;
      const name = String(row.employee_name ?? "").toLowerCase();
      const payCode = String(row.pay_code ?? "").toLowerCase();
      return name.includes(token) || payCode.includes(token);
    });
  }

  return rows.map((row) =>
    mapBiometricAttendanceGridRow(row as Record<string, unknown>)
  );
}

async function fetchBiometricGridRows(
  limit: number,
  date?: string,
  search?: string
): Promise<BiometricAttendanceGridRow[]> {
  if (isSupabaseServerConfigured()) {
    await ensureAttendanceTablesSchema();
    const supabase = createAdminClient();
    try {
      return await fetchBiometricGridRowsSupabase(limit, date, search);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isAttendanceSchemaError(message)) {
        const prismaRows = await fetchBiometricGridViaPrisma(limit, date, search);
        if (prismaRows.length > 0) return prismaRows;
        const storageRows = await fetchStorageGridRows(supabase, { limit, date, search });
        if (storageRows.length > 0) return storageRows;
      }
      console.error("[attendance/biometric] supabase biometric fetch failed:", error);
    }
  }

  const prismaRows = await fetchBiometricGridViaPrisma(limit, date, search);
  if (prismaRows.length > 0) return prismaRows;

  if (isSupabaseServerConfigured()) {
    const supabase = createAdminClient();
    return fetchStorageGridRows(supabase, { limit, date, search });
  }

  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "300"), MAX_MERGED_ROWS);
    const date = searchParams.get("date")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const includeDates = searchParams.get("includeDates") === "1";

    const [biometricRows, legacyRows, availableDates] = await Promise.all([
      fetchBiometricGridRows(limit, date, search),
      fetchLegacyAttendanceGridRows({ date, search, limit }),
      includeDates ? fetchAttendanceDateCatalog() : Promise.resolve(undefined),
    ]);

    const rows = mergeAttendanceGridRows(biometricRows, legacyRows).slice(0, MAX_MERGED_ROWS);

    return NextResponse.json({
      rows,
      meta: {
        biometricCount: biometricRows.length,
        legacyCount: legacyRows.length,
        mergedCount: rows.length,
      },
      availableDates,
    });
  } catch (error) {
    console.error("[attendance/biometric] GET failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load attendance records.",
        rows: [],
        meta: { biometricCount: 0, legacyCount: 0, mergedCount: 0 },
      },
      { status: 500 }
    );
  }
}
