import { NextResponse } from "next/server";
import {
  attendanceDateFromPunchIn,
  parseAttendanceSyncBody,
  validateAttendanceSyncToken,
} from "@/lib/attendance-sync-auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const ATTENDANCE_TABLE = "employee_attendance";

export async function POST(request: Request) {
  const authError = validateAttendanceSyncToken(request);
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured for attendance sync." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAttendanceSyncBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { employeeId, punchIn, punchOut } = parsed;
  const attendanceDate = attendanceDateFromPunchIn(punchIn);

  try {
    const supabase = createAdminClient();

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) throw employeeError;
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const upsertPayload: Record<string, unknown> = {
      employee_id: employeeId,
      attendance_date: attendanceDate,
      status: "present",
      notes: punchOut
        ? `Webhook sync — in: ${punchIn}, out: ${punchOut}`
        : `Webhook sync — in: ${punchIn}`,
    };

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .upsert(upsertPayload, { onConflict: "employee_id,attendance_date" })
      .select("id, employee_id, attendance_date, status")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: "Attendance log synced successfully.",
      record: data,
      punch_in: punchIn,
      punch_out: punchOut || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Attendance sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/attendance/sync",
    method: "POST",
    auth: "Authorization: Bearer <ATTENDANCE_SYNC_API_TOKEN>",
    body: {
      employee_id: "uuid",
      punch_in: "ISO-8601 datetime",
      punch_out: "ISO-8601 datetime (optional)",
    },
  });
}
