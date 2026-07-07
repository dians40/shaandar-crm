export const MANUAL_WAGE_LOG_STORAGE_KEY = "shaandar-manual-wage-entry-log";

export const MANUAL_ATTENDANCE_LOG_UPDATED_EVENT = "manual-attendance-log-updated";

import type { OvertimeShiftType } from "@/types/manual-attendance-entry";

export type ManualAttendanceLogRow = {
  id: string;
  employeeName: string;
  attendanceDate: string;
  status: string;
  overtimeShift: OvertimeShiftType | "";
  dailyWage: number;
  remarks: string;
};

export function readManualAttendanceLog(): ManualAttendanceLogRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MANUAL_WAGE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ManualAttendanceLogRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeManualAttendanceLog(rows: ManualAttendanceLogRow[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MANUAL_WAGE_LOG_STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(MANUAL_ATTENDANCE_LOG_UPDATED_EVENT));
}

export function getTodayManualEntryEmployeeNames(): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const names = readManualAttendanceLog()
    .filter((row) => row.attendanceDate === today)
    .map((row) => row.employeeName.trim())
    .filter(Boolean);
  return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right));
}

export function mergeManualEntryNamesIntoOptions(existing: string[]): string[] {
  const set = new Set(existing.map((value) => value.trim()).filter(Boolean));
  for (const name of getTodayManualEntryEmployeeNames()) {
    set.add(name);
  }
  return Array.from(set).sort((left, right) => left.localeCompare(right));
}
