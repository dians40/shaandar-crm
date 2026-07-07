import type { Prisma } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapLegacyEmployeeAttendanceToGridRow,
  type LegacyEmployeeAttendanceDbRow,
} from "@/lib/legacy-attendance-grid-fusion";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";

const LEGACY_ATTENDANCE_TABLE = "employee_attendance";

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function matchesLegacySearch(row: BiometricAttendanceGridRow, search: string): boolean {
  const token = search.toLowerCase();
  return (
    row.employeeName.toLowerCase().includes(token) ||
    row.payCode.toLowerCase().includes(token)
  );
}

function toAttendanceDateIso(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return normalizeAttendanceDateIso(String(value));
}

async function enrichLegacyRowsWithEmployees(
  supabase: SupabaseClient,
  rows: LegacyEmployeeAttendanceDbRow[]
): Promise<LegacyEmployeeAttendanceDbRow[]> {
  const employeeIds = [...new Set(rows.map((row) => row.employee_id).filter(Boolean))];
  if (employeeIds.length === 0) return rows;

  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, full_name, mobile_number")
    .in("id", employeeIds);

  if (error) {
    console.error("[legacy-attendance] employee lookup failed:", error.message);
    return rows;
  }

  const employeeMap = new Map(
    (employees ?? []).map((employee) => [
      String(employee.id),
      {
        full_name: employee.full_name as string | null,
        mobile_number: employee.mobile_number as string | null,
      },
    ])
  );

  return rows.map((row) => ({
    ...row,
    employees: employeeMap.get(row.employee_id) ?? row.employees ?? null,
  }));
}

/** Fetch legacy rows via Prisma (public.employee_attendance). */
async function fetchLegacyAttendanceGridRowsPrisma(options?: {
  date?: string;
  search?: string;
  limit?: number;
}): Promise<BiometricAttendanceGridRow[]> {
  if (!prisma) return [];

  const limit = Math.min(options?.limit ?? 300, 500);
  const normalizedDate = options?.date
    ? normalizeAttendanceDateIso(options.date)
    : undefined;
  const searchToken = safeString(options?.search);

  const where: Prisma.EmployeeAttendanceWhereInput = {};
  if (normalizedDate) {
    where.attendanceDate = new Date(`${normalizedDate}T12:00:00.000Z`);
  }

  const rows = await prisma.employeeAttendance.findMany({
    where,
    orderBy: { attendanceDate: "desc" },
    take: limit,
  });

  let legacyRows: LegacyEmployeeAttendanceDbRow[] = rows.map((row) => ({
    id: row.id,
    employee_id: row.employeeId,
    attendance_date: toAttendanceDateIso(row.attendanceDate),
    status: row.status,
    notes: row.notes,
    created_at: row.createdAt?.toISOString() ?? null,
    employees: null,
  }));

  if (isSupabaseServerConfigured()) {
    try {
      legacyRows = await enrichLegacyRowsWithEmployees(createAdminClient(), legacyRows);
    } catch (error) {
      console.error("[legacy-attendance] prisma employee enrich failed:", error);
    }
  }

  let mapped = legacyRows.map((row) => mapLegacyEmployeeAttendanceToGridRow(row));

  if (searchToken) {
    mapped = mapped.filter((row) => matchesLegacySearch(row, searchToken));
  }

  return mapped;
}

/** Fetch legacy employee_attendance rows via Supabase admin client. */
async function fetchLegacyAttendanceGridRowsSupabase(
  supabase: SupabaseClient,
  options?: { date?: string; search?: string; limit?: number }
): Promise<BiometricAttendanceGridRow[]> {
  const limit = Math.min(options?.limit ?? 300, 500);
  const normalizedDate = options?.date
    ? normalizeAttendanceDateIso(options.date)
    : undefined;
  const searchToken = safeString(options?.search);

  let query = supabase
    .from(LEGACY_ATTENDANCE_TABLE)
    .select("id, employee_id, attendance_date, status, notes, created_at")
    .order("attendance_date", { ascending: false })
    .limit(limit);

  if (normalizedDate) {
    query = query.eq("attendance_date", normalizedDate);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let legacyRows: LegacyEmployeeAttendanceDbRow[] = (data ?? []).map((row) => ({
    id: String(row.id),
    employee_id: String(row.employee_id),
    attendance_date: toAttendanceDateIso(row.attendance_date as string | Date),
    status: String(row.status ?? ""),
    notes: (row.notes as string | null | undefined) ?? null,
    created_at: (row.created_at as string | null | undefined) ?? null,
    employees: null,
  }));

  legacyRows = await enrichLegacyRowsWithEmployees(supabase, legacyRows);

  let mapped = legacyRows.map((row) => mapLegacyEmployeeAttendanceToGridRow(row));

  if (searchToken) {
    mapped = mapped.filter((row) => matchesLegacySearch(row, searchToken));
  }

  return mapped;
}

/** Dual-path legacy fetch — Prisma first, Supabase fallback; never silently skip. */
export async function fetchLegacyAttendanceGridRows(
  supabaseOrOptions?: SupabaseClient | { date?: string; search?: string; limit?: number },
  maybeOptions?: { date?: string; search?: string; limit?: number }
): Promise<BiometricAttendanceGridRow[]> {
  const options =
    supabaseOrOptions &&
    typeof supabaseOrOptions === "object" &&
    "from" in supabaseOrOptions
      ? maybeOptions
      : (supabaseOrOptions as { date?: string; search?: string; limit?: number } | undefined);

  const supabaseClient =
    supabaseOrOptions &&
    typeof supabaseOrOptions === "object" &&
    "from" in supabaseOrOptions
      ? supabaseOrOptions
      : isSupabaseServerConfigured()
        ? createAdminClient()
        : null;

  if (isPrismaConfigured()) {
    try {
      const prismaRows = await fetchLegacyAttendanceGridRowsPrisma(options);
      if (prismaRows.length > 0) return prismaRows;
    } catch (error) {
      console.error("[legacy-attendance] prisma fetch failed:", error);
    }
  }

  if (supabaseClient) {
    return fetchLegacyAttendanceGridRowsSupabase(supabaseClient, options);
  }

  return [];
}
