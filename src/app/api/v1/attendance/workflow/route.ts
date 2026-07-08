import { NextResponse } from "next/server";
import { requireFullAccessUser } from "@/lib/api/auth-guard";
import type { ManualAttendanceStatus } from "@/types/manual-attendance-entry";
import { BIOMETRIC_DAY_CODE } from "@/types/manual-attendance-entry";
import { ingestManualAttendanceToPipeline } from "@/lib/manual-attendance-pipeline-ingest";
import {
  buildDefaultAttendanceWorkflowNotes,
  normalizeAttendanceWorkflowRecord,
  parseAttendanceWorkflowNotes,
  serializeAttendanceWorkflowNotes,
  type AttendanceWorkflowRecord,
} from "@/types/attendance-workflow";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRowsByPipelineStage, gridRowsToWorkflowRecords } from "@/lib/attendance-pipeline-service";
import { PIPELINE_STAGES } from "@/types/attendance-pipeline";
import {
  ensureAttendanceTablesSchema,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";

const ATTENDANCE_TABLE = "employee_attendance";
const STAGING_TABLE = "attendance_staging";

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

function recordKey(record: AttendanceWorkflowRecord): string {
  return `${record.employeeId}|${record.attendanceDate}`;
}

export async function GET(request: Request) {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ records: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate")?.trim() || undefined;
    const toDate = searchParams.get("toDate")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    await ensureAttendanceTablesSchema();
    const rows = await fetchRowsByPipelineStage(PIPELINE_STAGES.LAYER_3_WORKFLOW, {
      limit: 500,
      fromDate,
      toDate,
      search,
    });
    const records = gridRowsToWorkflowRecords(rows).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    return NextResponse.json({ records, meta: { pipelineStage: PIPELINE_STAGES.LAYER_3_WORKFLOW } });
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

    // Staging-sourced Stage 1 records — upsert workflow progress to employee_attendance.
    const { data: stagingRow, error: stagingError } = await supabase
      .from(STAGING_TABLE)
      .select("*")
      .eq("id", payload.id)
      .maybeSingle();

    if (stagingError && !isAttendanceSchemaError(stagingError.message ?? "")) {
      throw stagingError;
    }

    if (stagingRow) {
      const employeeId = stagingRow.employee_id
        ? String(stagingRow.employee_id)
        : String(stagingRow.pay_code ?? "");
      const attendanceDate = String(stagingRow.date ?? "").slice(0, 10);
      const punchIn =
        payload.punchIn ??
        (stagingRow.corrected_in_time
          ? String(stagingRow.corrected_in_time)
          : stagingRow.machine_in_time
            ? String(stagingRow.machine_in_time)
            : "");
      const punchOut =
        payload.punchOut ??
        (stagingRow.corrected_out_time
          ? String(stagingRow.corrected_out_time)
          : stagingRow.machine_out_time
            ? String(stagingRow.machine_out_time)
            : "");

      const merged = normalizeAttendanceWorkflowRecord({
        id: payload.id,
        employeeId,
        employeeName:
          payload.employeeName ?? String(stagingRow.employee_name ?? stagingRow.pay_code ?? ""),
        attendanceDate,
        punchIn,
        punchOut,
        assignedMachine: payload.assignedMachine ?? "",
        workflowStage: payload.workflowStage ?? "pending_allocation",
        operatorVerifiedAt: payload.operatorVerifiedAt ?? null,
        operatorVerifiedBy: payload.operatorVerifiedBy ?? null,
        supervisorApprovedAt: payload.supervisorApprovedAt ?? null,
        supervisorApprovedBy: payload.supervisorApprovedBy ?? null,
        attachmentPhotos: payload.attachmentPhotos ?? [],
        source: payload.source ?? "manual",
      });

      if (!stagingRow.employee_id) {
        return NextResponse.json({
          ok: true,
          record: merged,
          message: "Workflow updated locally — employee_id missing on staging row.",
        });
      }

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
        stagingId: payload.id,
      };

      const { data: upserted, error: upsertError } = await supabase
        .from(ATTENDANCE_TABLE)
        .upsert(
          {
            employee_id: stagingRow.employee_id,
            attendance_date: attendanceDate,
            status: merged.workflowStage === "finalized" ? "present" : "present",
            notes: serializeAttendanceWorkflowNotes(notesPayload),
          },
          { onConflict: "employee_id,attendance_date" }
        )
        .select("id")
        .single();

      if (upsertError) throw upsertError;

      const record = normalizeAttendanceWorkflowRecord({
        ...merged,
        id: upserted?.id ? String(upserted.id) : merged.id,
      });

      return NextResponse.json({ ok: true, record });
    }

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
  remarks?: string;
  punchIn?: string;
  punchOut?: string;
  dailyWage?: number;
};

export async function POST(request: Request) {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

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
  const status = payload.status ?? BIOMETRIC_DAY_CODE;

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
  const dailyWage = Number.isFinite(Number(payload.dailyWage)) ? Number(payload.dailyWage) : 0;

  try {
    const saved = await ingestManualAttendanceToPipeline({
      employeeId,
      employeeName,
      attendanceDate,
      status,
      punchIn,
      punchOut,
      remarks,
      dailyWage,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Manual attendance submitted to Layer 2 staging — approve in the Attendance Control Center pipeline.",
      record: {
        id: saved.id,
        employeeId,
        employeeName,
        attendanceDate,
        payCode: saved.payCode,
        pipelineStage: PIPELINE_STAGES.LAYER_2_STAGING,
      },
      sync: {
        employee_id: employeeId,
        punch_in: punchIn,
        punch_out: punchOut || null,
        status,
        overtime_hours: 0,
        remarks,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manual attendance save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
