import { NextResponse } from "next/server";
import { mapAttendanceRecordFromDb } from "@/lib/biometric-attendance-db-mapper";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const BIOMETRIC_TABLE = "biometric_attendance";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 500);
    const date = searchParams.get("date")?.trim();

    if (isPrismaConfigured() && prisma) {
      const normalizedDate = date ? normalizeAttendanceDateIso(date) : undefined;
      const rows = await prisma.attendance.findMany({
        where: normalizedDate
          ? {
              OR: [
                { attendanceDate: new Date(`${normalizedDate}T00:00:00.000Z`) },
                { date: normalizedDate },
              ],
            }
          : undefined,
        orderBy: [{ attendanceDate: "desc" }, { date: "desc" }, { payCode: "asc" }],
        take: limit,
      });

      return NextResponse.json({
        rows: rows.map((row) =>
          mapAttendanceRecordFromDb({
            id: row.id,
            employee_id: row.employeeId,
            attendance_date: row.attendanceDate?.toISOString().slice(0, 10),
            srl_number: row.srlNumber,
            pay_code: row.payCode,
            card_number: row.cardNumber,
            employee_name: row.employeeName,
            department: row.department,
            designation: row.designation,
            shift: row.shift,
            date: row.date,
            start: row.start,
            in_time: row.inTime,
            lunch_out: row.lunchOut,
            lunch_in: row.lunchIn,
            out_time: row.outTime,
            hours_worked: row.hoursWorked,
            status: row.status,
            early_arrival: row.earlyArrival,
            shift_late: row.shiftLate,
            shift_early: row.shiftEarly,
            excess_lunch: row.excessLunch,
            ot: row.ot,
            overtime: row.overtime,
            overstay: row.overstay,
            manual: row.manual,
          })
        ),
      });
    }

    if (isSupabaseServerConfigured()) {
      const supabase = createAdminClient();
      let query = supabase
        .from(BIOMETRIC_TABLE)
        .select("*")
        .order("attendance_date", { ascending: false })
        .limit(limit);

      if (date) {
        const normalizedDate = normalizeAttendanceDateIso(date);
        query = query.or(
          `attendance_date.eq.${normalizedDate},date.eq.${normalizedDate}`
        );
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
      }

      return NextResponse.json({
        rows: (data ?? []).map((row) => mapAttendanceRecordFromDb(row as Record<string, unknown>)),
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
