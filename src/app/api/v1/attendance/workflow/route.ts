import { NextResponse } from "next/server";
import type { ManualAttendanceStatus } from "@/types/manual-attendance-entry";
import {
  buildDefaultAttendanceWorkflowNotes,
  normalizeAttendanceWorkflowRecord,
  parseAttendanceWorkflowNotes,
  serializeAttendanceWorkflowNotes,
  type AttendanceWorkflowRecord,
} from "@/types/attendance-workflow";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const ATTENDANCE_TABLE = "employee_attendance";

type DbRow = {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: string;
  notes: string | null;
  employees?: { name?: string } | { name?: string }[] | null;
};

function resolveEmployeeName(row: DbRow): string {
  const rel = row.employees;
  if (Array.isArray(rel)) return rel[0]?.name ?? "";
  return rel?.name ?? "";
}

function mapDbRowToWorkflow(row: DbRow): AttendanceWorkflowRecord | null {
  const parsed = parseAttendanceWorkflowNotes(row.notes);
  if (!parsed) return null;

  return normalizeAttendanceWorkflowRecord({
    id: row.id,
    employeeId: row.employee_id,
    employeeName: parsed.employeeName ?? resolveEmployeeName(row),
    attendanceDate: row.attendance_date,
    punchIn: parsed.punchIn,
    punchOut: parsed.punchOut,
    assignedMachine: parsed.assignedMachine,
    workflowStage: parsed.workflowStage,
    operatorVerifiedAt: parsed.operatorVerifiedAt,
    operatorVerifiedBy: parsed.operatorVerifiedBy,
    supervisorApprovedAt: parsed.supervisorApprovedAt,
    supervisorApprovedBy: parsed.supervisorApprovedBy,
    attachmentPhotos: parsed.attachmentPhotos,
    source: parsed.source,
  });
}

export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ records: [] });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("id, employee_id, attendance_date, status, notes, employees(name)")
      .order("attendance_date", { ascending: false })
      .limit(200);

    if (error) throw error;

    const records = (data ?? [])
      .map((row) => mapDbRowToWorkflow(row as DbRow))
      .filter((row): row is AttendanceWorkflowRecord => Boolean(row));

    return NextResponse.json({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workflow.";
    return NextResponse.json({ error: message, records: [] }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as Partial<AttendanceWorkflowRecord> & { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("id, employee_id, attendance_date, status, notes, employees(name)")
      .eq("id", payload.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }

    const currentNotes =
      parseAttendanceWorkflowNotes(existing.notes) ??
      buildDefaultAttendanceWorkflowNotes("", "");

    const merged = normalizeAttendanceWorkflowRecord({
      id: existing.id,
      employeeId: existing.employee_id,
      employeeName:
        payload.employeeName ??
        currentNotes.employeeName ??
        resolveEmployeeName(existing as DbRow),
      attendanceDate: existing.attendance_date,
      punchIn: payload.punchIn ?? currentNotes.punchIn,
      punchOut: payload.punchOut ?? currentNotes.punchOut,
      assignedMachine: payload.assignedMachine ?? currentNotes.assignedMachine,
      workflowStage: payload.workflowStage ?? currentNotes.workflowStage,
      operatorVerifiedAt: payload.operatorVerifiedAt ?? currentNotes.operatorVerifiedAt,
      operatorVerifiedBy: payload.operatorVerifiedBy ?? currentNotes.operatorVerifiedBy,
      supervisorApprovedAt:
        payload.supervisorApprovedAt ?? currentNotes.supervisorApprovedAt,
      supervisorApprovedBy:
        payload.supervisorApprovedBy ?? currentNotes.supervisorApprovedBy,
      attachmentPhotos: payload.attachmentPhotos ?? currentNotes.attachmentPhotos,
      source: payload.source ?? currentNotes.source,
    });

    const notesPayload = {
      source: merged.source,
      workflowStage: merged.workflowStage,
      punchIn: merged.punchIn,
      punchOut: merged.punchOut,
      assignedMachine: merged.assignedMachine,
      attachmentPhotos: merged.attachmentPhotos,
      operatorVerifiedAt: merged.operatorVerifiedAt,
      operatorVerifiedBy: merged.operatorVerifiedBy,
      supervisorApprovedAt: merged.supervisorApprovedAt,
      supervisorApprovedBy: merged.supervisorApprovedBy,
      employeeName: merged.employeeName,
    };

    const { error: updateError } = await supabase
      .from(ATTENDANCE_TABLE)
      .update({
        notes: serializeAttendanceWorkflowNotes(notesPayload),
        status: merged.workflowStage === "finalized" ? "present" : existing.status,
      })
      .eq("id", payload.id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, record: merged });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ManualEntryBody = {
  employeeId?: string;
  employeeName?: string;
  attendanceDate?: string;
  status?: ManualAttendanceStatus;
  overtimeHours?: number;
  remarks?: string;
  punchIn?: string;
  punchOut?: string;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as ManualEntryBody;
  const employeeId = String(payload.employeeId ?? "").trim();
  const attendanceDate = String(payload.attendanceDate ?? "").trim();
  const punchIn = String(payload.punchIn ?? "").trim();
  const status = payload.status ?? "present";

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
  }
  if (!attendanceDate) {
    return NextResponse.json({ error: "attendanceDate is required." }, { status: 400 });
  }
  if (!punchIn) {
    return NextResponse.json({ error: "punchIn is required." }, { status: 400 });
  }

  const punchOut = String(payload.punchOut ?? "").trim();
  const employeeName = String(payload.employeeName ?? "").trim();
  const remarks = String(payload.remarks ?? "").trim();
  const overtimeHours = Number(payload.overtimeHours) || 0;

  const workflowNotes = {
    ...buildDefaultAttendanceWorkflowNotes(punchIn, punchOut, employeeName || undefined),
    source: "manual" as const,
    manualStatus: status,
    overtimeHours,
    shiftRemarks: remarks,
  };

  const workflowRecord = normalizeAttendanceWorkflowRecord({
    id: `att-manual-${Date.now()}`,
    employeeId,
    employeeName,
    attendanceDate,
    punchIn,
    punchOut,
    assignedMachine: remarks,
    workflowStage: "pending_allocation",
    source: "manual",
  });

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      ok: true,
      message: "Attendance saved locally (database not configured).",
      record: workflowRecord,
      sync: {
        employee_id: employeeId,
        punch_in: punchIn,
        punch_out: punchOut || null,
        status,
        overtime_hours: overtimeHours,
        remarks,
      },
    });
  }

  try {
    const supabase = createAdminClient();
    const dbStatus =
      status === "present" || status === "half_day"
        ? "present"
        : status === "paid_leave"
          ? "leave"
          : "absent";

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .upsert(
        {
          employee_id: employeeId,
          attendance_date: attendanceDate,
          status: dbStatus,
          notes: serializeAttendanceWorkflowNotes(workflowNotes),
        },
        { onConflict: "employee_id,attendance_date" }
      )
      .select("id, employee_id, attendance_date, status")
      .single();

    if (error) throw error;

    const record = normalizeAttendanceWorkflowRecord({
      ...workflowRecord,
      id: String(data.id),
    });

    return NextResponse.json({
      ok: true,
      message: "Attendance log synced successfully.",
      record,
      sync: {
        employee_id: employeeId,
        punch_in: punchIn,
        punch_out: punchOut || null,
        status,
        overtime_hours: overtimeHours,
        remarks,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manual attendance save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
