import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase/admin";
import {
  ensureAttendanceTablesSchema,
  formatSchemaEnsureFailureMessage,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";

export type AttendanceDateCatalogEntry = {
  date: string;
  biometricCount: number;
  legacyCount: number;
  totalCount: number;
};

function bumpDate(
  catalog: Map<string, AttendanceDateCatalogEntry>,
  rawDate: unknown,
  source: "biometric" | "legacy"
) {
  const date = normalizeAttendanceDateIso(String(rawDate ?? ""));
  if (!date) return;
  const existing = catalog.get(date) ?? {
    date,
    biometricCount: 0,
    legacyCount: 0,
    totalCount: 0,
  };
  if (source === "biometric") existing.biometricCount += 1;
  else existing.legacyCount += 1;
  existing.totalCount = existing.biometricCount + existing.legacyCount;
  catalog.set(date, existing);
}

async function fetchDateCatalogSupabase(): Promise<AttendanceDateCatalogEntry[]> {
  await ensureAttendanceTablesSchema();

  const supabase = createAdminClient();
  const catalog = new Map<string, AttendanceDateCatalogEntry>();

  const { data: biometricRows, error: biometricError } = await supabase
    .from("biometric_attendance")
    .select("date, attendance_date")
    .limit(2000);

  if (biometricError) {
    if (isAttendanceSchemaError(biometricError.message ?? "")) {
      throw new Error(formatSchemaEnsureFailureMessage(biometricError.message));
    }
    throw new Error(biometricError.message);
  }

  for (const row of biometricRows ?? []) {
    const resolved = row.date || row.attendance_date;
    bumpDate(catalog, resolved, "biometric");
  }

  const { data: legacyRows, error: legacyError } = await supabase
    .from("employee_attendance")
    .select("attendance_date")
    .limit(2000);

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  for (const row of legacyRows ?? []) {
    bumpDate(catalog, row.attendance_date, "legacy");
  }

  return Array.from(catalog.values()).sort((left, right) =>
    right.date.localeCompare(left.date)
  );
}

async function fetchDateCatalogPrisma(): Promise<AttendanceDateCatalogEntry[]> {
  if (!prisma) return [];

  const catalog = new Map<string, AttendanceDateCatalogEntry>();

  const biometricRows = await prisma.$queryRaw<Array<{ date: string | null; attendance_date: Date | null }>>`
    SELECT date, attendance_date FROM public.biometric_attendance LIMIT 2000
  `;

  for (const row of biometricRows) {
    const resolved = row.date || row.attendance_date?.toISOString().slice(0, 10);
    bumpDate(catalog, resolved, "biometric");
  }

  const legacyRows = await prisma.employeeAttendance.findMany({
    select: { attendanceDate: true },
    take: 2000,
  });

  for (const row of legacyRows) {
    bumpDate(catalog, row.attendanceDate, "legacy");
  }

  return Array.from(catalog.values()).sort((left, right) =>
    right.date.localeCompare(left.date)
  );
}

/** Distinct attendance dates with per-source counts — powers date picker chips in the UI. */
export async function fetchAttendanceDateCatalog(): Promise<AttendanceDateCatalogEntry[]> {
  if (isSupabaseServerConfigured()) {
    try {
      return await fetchDateCatalogSupabase();
    } catch (error) {
      console.error("[attendance-date-catalog] supabase failed:", error);
    }
  }

  if (isPrismaConfigured()) {
    try {
      return await fetchDateCatalogPrisma();
    } catch (error) {
      console.error("[attendance-date-catalog] prisma failed:", error);
    }
  }

  return [];
}
