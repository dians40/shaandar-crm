import { fetchStorageGridRows } from "@/lib/attendance-storage-fallback";
import { DUPLICATE_DATE_ALERT_HI } from "@/constants/attendance-duplicate-alert";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import type { SupabaseClient } from "@supabase/supabase-js";

export { DUPLICATE_DATE_ALERT_HI };

export type DuplicateAttendanceCandidate = {
  employeeId: string;
  attendanceDate: string;
  payCode?: string;
  employeeName?: string;
};

export type DuplicateAttendanceMatch = {
  employeeId: string;
  attendanceDate: string;
  employeeName?: string;
  payCode?: string;
  source: "biometric_attendance" | "employee_attendance" | "storage";
};

export type DuplicateAttendanceCheckResult = {
  hasDuplicates: boolean;
  duplicates: DuplicateAttendanceMatch[];
};

function candidateKey(employeeId: string, attendanceDate: string): string {
  return `${employeeId}|${normalizeAttendanceDateIso(attendanceDate)}`;
}

function isMissingTableError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("does not exist") || lower.includes("could not find the table");
}

/** Pre-save guard — query by attendance_date + employee_id (and pay_code fallback). */
export async function findDuplicateAttendanceRecords(
  supabase: SupabaseClient,
  candidates: DuplicateAttendanceCandidate[]
): Promise<DuplicateAttendanceCheckResult> {
  const deduped = new Map<string, DuplicateAttendanceCandidate>();
  for (const candidate of candidates) {
    const employeeId = String(candidate.employeeId ?? "").trim();
    const attendanceDate = normalizeAttendanceDateIso(candidate.attendanceDate);
    if (!employeeId || !attendanceDate) continue;
    deduped.set(candidateKey(employeeId, attendanceDate), {
      employeeId,
      attendanceDate,
      payCode: candidate.payCode?.trim(),
      employeeName: candidate.employeeName?.trim(),
    });
  }

  if (deduped.size === 0) {
    return { hasDuplicates: false, duplicates: [] };
  }

  const list = [...deduped.values()];
  const dates = [...new Set(list.map((entry) => entry.attendanceDate))];
  const employeeIds = [...new Set(list.map((entry) => entry.employeeId))];
  const payCodes = [
    ...new Set(list.map((entry) => entry.payCode).filter((value): value is string => Boolean(value))),
  ];

  const matches = new Map<string, DuplicateAttendanceMatch>();

  if (payCodes.length > 0 && dates.length > 0) {
    const { data, error } = await supabase
      .from("biometric_attendance")
      .select("pay_code, date, employee_name")
      .in("date", dates)
      .in("pay_code", payCodes);

    if (!error) {
      for (const row of data ?? []) {
        const payCode = String(row.pay_code ?? "").trim();
        const date = normalizeAttendanceDateIso(String(row.date ?? ""));
        const match = list.find(
          (entry) => entry.payCode === payCode && entry.attendanceDate === date
        );
        if (!match) continue;
        matches.set(candidateKey(match.employeeId, match.attendanceDate), {
          employeeId: match.employeeId,
          attendanceDate: match.attendanceDate,
          employeeName: match.employeeName ?? String(row.employee_name ?? ""),
          payCode,
          source: "biometric_attendance",
        });
      }
    } else if (!isMissingTableError(error.message ?? "")) {
      console.warn("[duplicate-guard] biometric_attendance lookup failed:", error.message);
    }
  }

  if (employeeIds.length > 0 && dates.length > 0) {
    for (const date of dates) {
      const idsForDate = list
        .filter((entry) => entry.attendanceDate === date)
        .map((entry) => entry.employeeId);
      if (idsForDate.length === 0) continue;

      const { data, error } = await supabase
        .from("employee_attendance")
        .select("employee_id, attendance_date")
        .eq("attendance_date", date)
        .in("employee_id", idsForDate);

      if (!error) {
        for (const row of data ?? []) {
          const employeeId = String(row.employee_id ?? "").trim();
          const attendanceDate = normalizeAttendanceDateIso(String(row.attendance_date ?? date));
          const match = list.find(
            (entry) => entry.employeeId === employeeId && entry.attendanceDate === attendanceDate
          );
          if (!match) continue;
          matches.set(candidateKey(employeeId, attendanceDate), {
            employeeId,
            attendanceDate,
            employeeName: match.employeeName,
            payCode: match.payCode,
            source: "employee_attendance",
          });
        }
      } else if (!isMissingTableError(error.message ?? "")) {
        console.warn("[duplicate-guard] employee_attendance lookup failed:", error.message);
      }
    }
  }

  for (const date of dates) {
    try {
      const storageRows = await fetchStorageGridRows(supabase, { date, limit: 500 });
      for (const row of storageRows) {
        const payCode = String(row.payCode ?? "").trim();
        const rowDate = normalizeAttendanceDateIso(row.date);
        const match = list.find(
          (entry) =>
            entry.attendanceDate === rowDate &&
            (entry.payCode === payCode || entry.employeeName === row.employeeName)
        );
        if (!match) continue;
        matches.set(candidateKey(match.employeeId, match.attendanceDate), {
          employeeId: match.employeeId,
          attendanceDate: match.attendanceDate,
          employeeName: match.employeeName ?? row.employeeName,
          payCode: match.payCode ?? payCode,
          source: "storage",
        });
      }
    } catch (error) {
      console.warn("[duplicate-guard] storage lookup failed:", error);
    }
  }

  const duplicates = [...matches.values()];
  return { hasDuplicates: duplicates.length > 0, duplicates };
}
