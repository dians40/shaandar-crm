import { NextResponse } from "next/server";
import {
  atomicFinalizeBulkDbPayload,
  buildBulkDbPayload,
  safeBulkNumeric,
  sanitizeBulkRowInput,
  type AttendanceBulkDbPayload,
} from "@/lib/attendance-bulk-payload-bridge";
import { normalizeRawRowKeys } from "@/lib/attendance-bulk-header-normalizer";
import { bulkRecordToWorkflowFields } from "@/types/attendance-bulk-import-row";
import { BIOMETRIC_DAY_CODE, normalizeBiometricCode } from "@/types/manual-attendance-entry";
import {
  buildDefaultAttendanceWorkflowNotes,
  normalizeAttendanceWorkflowRecord,
  serializeAttendanceWorkflowNotes,
} from "@/types/attendance-workflow";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const ATTENDANCE_TABLE = "employee_attendance";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function resolveEmployeeId(
  supabase: ReturnType<typeof createAdminClient>,
  employeeId: string,
  employeeName: string,
  payCode: string
): Promise<string | null> {
  try {
    if (employeeId && isValidUuid(employeeId)) {
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("id", employeeId)
        .maybeSingle();
      if (data?.id) return String(data.id);
    }

    if (employeeName) {
      const { data: byName } = await supabase
        .from("employees")
        .select("id")
        .ilike("full_name", employeeName)
        .limit(1)
        .maybeSingle();
      if (byName?.id) return String(byName.id);
    }

    if (payCode) {
      const { data: byMobile } = await supabase
        .from("employees")
        .select("id")
        .ilike("mobile_number", payCode)
        .limit(1)
        .maybeSingle();
      if (byMobile?.id) return String(byMobile.id);
    }

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function normalizeIncomingRow(raw: Record<string, unknown>): AttendanceBulkDbPayload | null {
  try {
    const normalizedKeys = normalizeRawRowKeys(raw);
    const employeeId = safeString(
      normalizedKeys.employee_id ?? normalizedKeys.employeeId
    );
    const employeeName = safeString(
      normalizedKeys.employee_name ?? normalizedKeys.employeeName
    );
    const payCode = safeString(normalizedKeys.pay_code ?? normalizedKeys.payCode);
    const attendanceDate =
      safeString(normalizedKeys.attendance_date ?? normalizedKeys.attendanceDate) ||
      todayIsoDate();

    if (!employeeId && !employeeName && !payCode) return null;

    const biometric = sanitizeBulkRowInput(normalizedKeys);
    const payload = atomicFinalizeBulkDbPayload(
      buildBulkDbPayload({
        row: biometric,
        employeeId: employeeId || payCode || employeeName,
        attendanceDate,
      })
    );

    return {
      ...payload,
      employee_name: payload.employee_name || employeeName,
      pay_code: payload.pay_code || payCode,
      punch_in:
        safeString(normalizedKeys.punch_in ?? normalizedKeys.punchIn) || payload.punch_in,
      punch_out:
        safeString(normalizedKeys.punch_out ?? normalizedKeys.punchOut) || payload.punch_out,
      overtime_hours:
        safeBulkNumeric(normalizedKeys.overtime_hours ?? normalizedKeys.overtimeHours) ||
        payload.overtime_hours,
      remarks:
        safeString(normalizedKeys.remarks ?? normalizedKeys.shift_remarks) || payload.remarks,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as { rows?: unknown[] };
  if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
    return NextResponse.json({ error: "rows array is required." }, { status: 400 });
  }

  const normalizedRows: AttendanceBulkDbPayload[] = [];
  const rowErrors: string[] = [];

  for (let index = 0; index < payload.rows.length; index += 1) {
    try {
      const raw = payload.rows[index];
      if (!raw || typeof raw !== "object") {
        rowErrors.push(`Row ${index + 1}: invalid row object.`);
        continue;
      }
      const normalized = normalizeIncomingRow(raw as Record<string, unknown>);
      if (!normalized) {
        rowErrors.push(`Row ${index + 1}: missing employee identity fields.`);
        continue;
      }
      if (!normalized.punch_in) {
        rowErrors.push(`Row ${index + 1}: punch_in is required.`);
        continue;
      }
      normalizedRows.push(normalized);
    } catch (rowError) {
      console.error(rowError);
      rowErrors.push(`Row ${index + 1}: sanitization failed.`);
    }
  }

  if (normalizedRows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows to import.", errors: rowErrors },
      { status: 400 }
    );
  }

  const records: ReturnType<typeof normalizeAttendanceWorkflowRecord>[] = [];
  let imported = 0;
  let skipped = 0;

  if (!isSupabaseServerConfigured()) {
    for (const row of normalizedRows) {
      try {
        const mapped = bulkRecordToWorkflowFields(sanitizeBulkRowInput(row));
        records.push(
          normalizeAttendanceWorkflowRecord({
            id: `att-bulk-${Date.now()}-${imported}`,
            employeeId: row.employee_id,
            employeeName: row.employee_name || mapped.employeeName,
            attendanceDate: row.attendance_date,
            punchIn: row.punch_in,
            punchOut: row.punch_out,
            assignedMachine: row.remarks,
            workflowStage: "pending_allocation",
            source: "manual",
          })
        );
        imported += 1;
      } catch (error) {
        console.error(error);
        skipped += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Bulk attendance saved locally (database not configured).",
      imported,
      skipped,
      errors: rowErrors,
      records,
    });
  }

  try {
    const supabase = createAdminClient();

    for (const row of normalizedRows) {
      try {
        const resolvedEmployeeId = await resolveEmployeeId(
          supabase,
          row.employee_id,
          row.employee_name,
          row.pay_code
        );

        if (!resolvedEmployeeId) {
          skipped += 1;
          rowErrors.push(
            `${row.employee_name || row.pay_code || row.employee_id}: employee not found in database.`
          );
          continue;
        }

        const status = normalizeBiometricCode(row.status || row.shift || BIOMETRIC_DAY_CODE);
        const overtimeShift = normalizeBiometricCode(
          row.overtime_shift || row.ot || row.overtime || status
        );
        const overtimeHours = safeBulkNumeric(row.overtime_hours);
        const remarks = row.remarks || "";

        const workflowNotes = {
          ...buildDefaultAttendanceWorkflowNotes(
            row.punch_in,
            row.punch_out,
            row.employee_name || undefined
          ),
          source: "manual" as const,
          manualStatus: status,
          overtimeHours,
          overtimeShift,
          shiftRemarks: [
            remarks,
            row.srl_number ? `SRL: ${row.srl_number}` : "",
            row.pay_code ? `Pay Code: ${row.pay_code}` : "",
            row.hours_worked ? `Hours: ${row.hours_worked}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
        };

        const { data, error } = await supabase
          .from(ATTENDANCE_TABLE)
          .upsert(
            {
              employee_id: resolvedEmployeeId,
              attendance_date: row.attendance_date,
              status: "present",
              notes: serializeAttendanceWorkflowNotes(workflowNotes),
            },
            { onConflict: "employee_id,attendance_date" }
          )
          .select("id, employee_id, attendance_date, status")
          .single();

        if (error) {
          console.error(error);
          skipped += 1;
          rowErrors.push(
            `${row.employee_name || row.pay_code}: ${error.message ?? "database insert failed"}`
          );
          continue;
        }

        records.push(
          normalizeAttendanceWorkflowRecord({
            id: String(data.id),
            employeeId: resolvedEmployeeId,
            employeeName: row.employee_name,
            attendanceDate: row.attendance_date,
            punchIn: row.punch_in,
            punchOut: row.punch_out,
            assignedMachine: remarks,
            workflowStage: "pending_allocation",
            source: "manual",
          })
        );
        imported += 1;
      } catch (rowError) {
        console.error(rowError);
        skipped += 1;
        rowErrors.push(
          `${row.employee_name || row.pay_code || "Row"}: ${
            rowError instanceof Error ? rowError.message : "insert failed"
          }`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Bulk attendance import completed.",
      imported,
      skipped,
      errors: rowErrors.slice(0, 20),
      records,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Bulk attendance import failed.";
    return NextResponse.json(
      { error: message, imported, skipped, errors: rowErrors },
      { status: 500 }
    );
  }
}
