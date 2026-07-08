import {
  extractDepartmentNamesFromRows,
  syncDepartmentsInDb,
} from "@/lib/department-master-db-store";
import { syncDepartmentsFromAttendanceServer } from "@/lib/department-master-server-store";

export async function autoSyncDepartmentsFromAttendanceRows(
  rows: Array<{ department?: unknown }>
): Promise<number> {
  const names = extractDepartmentNamesFromRows(rows);
  if (names.length === 0) return 0;
  return syncDepartmentsFromAttendanceServer(names);
}

export async function autoSyncDepartmentName(name: string): Promise<number> {
  const token = name.trim().replace(/\s+/g, " ");
  if (!token) return 0;
  return syncDepartmentsFromAttendanceServer([token]);
}

export { extractDepartmentNamesFromRows, syncDepartmentsInDb };
