import { NextResponse } from "next/server";
import { requireFullAccessUser } from "@/lib/api/auth-guard";
import {
  ATTENDANCE_PURGE_CONFIRM_TOKEN,
  purgeAttendanceTransactionalData,
} from "@/lib/admin/attendance-transactional-purge";

/**
 * V19 — Admin-only purge of transactional attendance/import data.
 * POST /api/admin/purge-attendance-data
 * Body: { "confirm": "PURGE_ATTENDANCE_TRANSACTIONAL_V19" }
 *
 * Does NOT modify UI, pipeline code, departments, or designations.
 */
export async function POST(request: Request) {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (String(body.confirm ?? "") !== ATTENDANCE_PURGE_CONFIRM_TOKEN) {
    return NextResponse.json(
      {
        error: "Confirmation token required.",
        requiredConfirm: ATTENDANCE_PURGE_CONFIRM_TOKEN,
        hint: "Send POST with JSON body confirm token to purge transactional attendance data only.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await purgeAttendanceTransactionalData();
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    console.error("[admin/purge-attendance-data]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Attendance purge failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

  return NextResponse.json({
    endpoint: "/api/admin/purge-attendance-data",
    method: "POST",
    confirmToken: ATTENDANCE_PURGE_CONFIRM_TOKEN,
    purges: [
      "biometric_attendance",
      "employee_attendance",
      "attendance_staging",
      "attendance_audit_log",
      "attendance-imports storage batches",
      "pipeline stage overlay manifest",
    ],
    preserves: [
      "employees",
      "departments",
      "designations",
      "application source code",
      "4-layer pipeline architecture",
    ],
  });
}
