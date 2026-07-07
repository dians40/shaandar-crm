import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import { fetchLegacyAttendanceGridRows } from "@/lib/legacy-attendance-fetch";
import { mergeAttendanceGridRows } from "@/lib/legacy-attendance-grid-fusion";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const BIOMETRIC_TABLE = "biometric_attendance";
const MAX_MERGED_ROWS = 500;

function buildPrismaWhere(
  date?: string,
  search?: string
): Prisma.BiometricAttendanceWhereInput | undefined {
  const normalizedDate = date ? normalizeAttendanceDateIso(date) : undefined;
  const searchToken = search?.trim();

  if (!normalizedDate && !searchToken) return undefined;

  const clauses: Prisma.BiometricAttendanceWhereInput[] = [];
  if (normalizedDate) clauses.push({ date: normalizedDate });
  if (searchToken) {
    clauses.push({
      OR: [
        { employeeName: { contains: searchToken, mode: "insensitive" } },
        { payCode: { contains: searchToken, mode: "insensitive" } },
      ],
    });
  }

  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

async function fetchBiometricGridRows(
  limit: number,
  date?: string,
  search?: string
): Promise<BiometricAttendanceGridRow[]> {
  if (isPrismaConfigured() && prisma) {
    const rows = await prisma.biometricAttendance.findMany({
      where: buildPrismaWhere(date, search),
      orderBy: [{ date: "desc" }, { payCode: "asc" }],
      take: limit,
    });

    return rows.map((row) =>
      mapBiometricAttendanceGridRow({
        id: row.id,
        srl_no: row.srlNo,
        pay_code: row.payCode,
        card_no: row.cardNo,
        employee_name: row.employeeName,
        department: row.department,
        designation: row.designation,
        shift: row.shift,
        date: row.date,
        status: row.status,
        in_time: row.inTime,
        out_time: row.outTime,
        duration: row.duration,
        early_in: row.earlyIn,
        late_in: row.lateIn,
        early_out: row.earlyOut,
        late_out: row.lateOut,
        ot_hours: row.otHours,
        short_hours: row.shortHours,
        gross_hours: row.grossHours,
        net_hours: row.netHours,
        work_code: row.workCode,
        remark: row.remark,
        created_at: row.createdAt,
      })
    );
  }

  if (isSupabaseServerConfigured()) {
    const supabase = createAdminClient();
    let query = supabase
      .from(BIOMETRIC_TABLE)
      .select("*")
      .order("date", { ascending: false })
      .limit(limit);

    if (date) {
      const normalizedDate = normalizeAttendanceDateIso(date);
      query = query.eq("date", normalizedDate);
    }

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`employee_name.ilike.${pattern},pay_code.ilike.${pattern}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) =>
      mapBiometricAttendanceGridRow(row as Record<string, unknown>)
    );
  }

  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "300"), MAX_MERGED_ROWS);
    const date = searchParams.get("date")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const [biometricRows, legacyRows] = await Promise.all([
      fetchBiometricGridRows(limit, date, search),
      fetchLegacyAttendanceGridRows({ date, search, limit }),
    ]);

    const rows = mergeAttendanceGridRows(biometricRows, legacyRows).slice(
      0,
      Math.min(MAX_MERGED_ROWS, limit * 2)
    );

    return NextResponse.json({
      rows,
      meta: {
        biometricCount: biometricRows.length,
        legacyCount: legacyRows.length,
        mergedCount: rows.length,
      },
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
