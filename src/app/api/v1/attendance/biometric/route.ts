import { NextResponse } from "next/server";
import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import { fetchAttendanceDateCatalog } from "@/lib/attendance-date-catalog";
import { fetchLegacyAttendanceGridRows } from "@/lib/legacy-attendance-fetch";
import { mergeAttendanceGridRows } from "@/lib/legacy-attendance-grid-fusion";
import {
  fetchStorageDateCatalog,
  fetchStorageGridRows,
  isStorageFallbackError,
} from "@/lib/attendance-storage-fallback";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

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
    if (isStorageFallbackError(error.message ?? "")) {
      return fetchStorageGridRows(supabase, { limit, date, search });
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

/** Prisma fallback — raw SQL to include legacy column names not in the Prisma model. */
async function fetchBiometricGridRowsPrismaRaw(
  limit: number,
  date?: string,
  search?: string
): Promise<BiometricAttendanceGridRow[]> {
  if (!prisma) return [];

  const normalizedDate = normalizeDateFilter(date);
  const searchToken = search?.trim();
  const searchPattern = searchToken ? `%${searchToken}%` : null;

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT *
    FROM public.biometric_attendance
    WHERE
      (${normalizedDate ?? null}::text IS NULL OR date = ${normalizedDate ?? ""} OR attendance_date::text = ${normalizedDate ?? ""})
      AND (
        ${searchPattern}::text IS NULL
        OR employee_name ILIKE ${searchPattern}
        OR pay_code ILIKE ${searchPattern}
      )
    ORDER BY COALESCE(NULLIF(date, ''), attendance_date::text, '') DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => mapBiometricAttendanceGridRow(row));
}

async function fetchBiometricGridRows(
  limit: number,
  date?: string,
  search?: string
): Promise<BiometricAttendanceGridRow[]> {
  if (isSupabaseServerConfigured()) {
    try {
      const dbRows = await fetchBiometricGridRowsSupabase(limit, date, search);
      if (dbRows.length > 0) return dbRows;

      const supabase = createAdminClient();
      const storageRows = await fetchStorageGridRows(supabase, { limit, date, search });
      if (storageRows.length > 0) return storageRows;
    } catch (error) {
      console.error("[attendance/biometric] supabase biometric fetch failed:", error);
      try {
        const supabase = createAdminClient();
        const storageRows = await fetchStorageGridRows(supabase, { limit, date, search });
        if (storageRows.length > 0) return storageRows;
      } catch (storageError) {
        console.error("[attendance/biometric] storage fallback fetch failed:", storageError);
      }
    }
  }

  if (isPrismaConfigured()) {
    try {
      return await fetchBiometricGridRowsPrismaRaw(limit, date, search);
    } catch (error) {
      console.error("[attendance/biometric] prisma raw biometric fetch failed:", error);
    }
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
