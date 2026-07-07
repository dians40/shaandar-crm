import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapLegacyEmployeeAttendanceToGridRow,
  type LegacyEmployeeAttendanceDbRow,
} from "@/lib/legacy-attendance-grid-fusion";
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

/** Fetch legacy employee_attendance rows and map to unified grid shape. */
export async function fetchLegacyAttendanceGridRows(
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
    .select(
      "id, employee_id, attendance_date, status, notes, created_at, employees(full_name, mobile_number)"
    )
    .order("attendance_date", { ascending: false })
    .limit(limit);

  if (normalizedDate) {
    query = query.eq("attendance_date", normalizedDate);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []).map((row) =>
    mapLegacyEmployeeAttendanceToGridRow(row as LegacyEmployeeAttendanceDbRow)
  );

  if (searchToken) {
    rows = rows.filter((row) => matchesLegacySearch(row, searchToken));
  }

  return rows;
}
