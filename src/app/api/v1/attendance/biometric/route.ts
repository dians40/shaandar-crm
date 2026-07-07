import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { mapBiometricAttendanceGridRow } from "@/lib/biometric-attendance-db-mapper";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const BIOMETRIC_TABLE = "biometric_attendance";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "300"), 500);
    const date = searchParams.get("date")?.trim();
    const search = searchParams.get("search")?.trim();

    if (isPrismaConfigured() && prisma) {
      const rows = await prisma.biometricAttendance.findMany({
        where: buildPrismaWhere(date, search),
        orderBy: [{ date: "desc" }, { payCode: "asc" }],
        take: limit,
      });

      return NextResponse.json({
        rows: rows.map((row) =>
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
        ),
      });
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
        query = query.or(
          `employee_name.ilike.${pattern},pay_code.ilike.${pattern}`
        );
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
      }

      return NextResponse.json({
        rows: (data ?? []).map((row) =>
          mapBiometricAttendanceGridRow(row as Record<string, unknown>)
        ),
      });
    }

    return NextResponse.json({ rows: [] });
  } catch (error) {
    console.error("[attendance/biometric] GET failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load biometric attendance.",
        rows: [],
      },
      { status: 500 }
    );
  }
}
