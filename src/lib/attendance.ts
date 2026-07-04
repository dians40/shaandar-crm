import type { SupabaseClient } from "@supabase/supabase-js";

const ATTENDANCE_TABLE = "employee_attendance";

function isMissingTableError(message: string): boolean {
  return (
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

/** Returns employee IDs that have at least one attendance record. */
export async function getEmployeeIdsWithAttendance(
  supabase: SupabaseClient,
  employeeIds: string[]
): Promise<Set<string>> {
  if (employeeIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(ATTENDANCE_TABLE)
    .select("employee_id")
    .in("employee_id", employeeIds);

  if (error) {
    if (isMissingTableError(error.message)) {
      return new Set();
    }
    throw error;
  }

  return new Set((data ?? []).map((row) => row.employee_id as string));
}

/** True when attendance has been logged for this employee. */
export async function employeeHasAttendance(
  supabase: SupabaseClient,
  employeeId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from(ATTENDANCE_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId);

  if (error) {
    if (isMissingTableError(error.message)) {
      return false;
    }
    throw error;
  }

  return (count ?? 0) > 0;
}
