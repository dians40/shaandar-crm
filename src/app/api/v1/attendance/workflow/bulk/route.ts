import { NextResponse } from "next/server";
import {
  resolveOrProvisionEmployeeId,
  mapExcelStatusToDbStatus,
  resolveOvertimeShiftFromBulkRow,
} from "@/lib/attendance-bulk-employee-resolver";
import { sanitizeIncomingBulkRow } from "@/lib/attendance-bulk-row-sanitizer";
import {
  mapToAttendanceCreate,
  mapToBiometricAttendanceRow,
} from "@/lib/biometric-attendance-db-mapper";
import { safeBulkNumeric, sanitizeBulkRowInput } from "@/lib/attendance-bulk-payload-bridge";
import { bulkRecordToWorkflowFields } from "@/types/attendance-bulk-import-row";
import { BIOMETRIC_DAY_CODE } from "@/types/manual-attendance-entry";
import {
  buildDefaultAttendanceWorkflowNotes,
  normalizeAttendanceWorkflowRecord,
  serializeAttendanceWorkflowNotes,
} from "@/types/attendance-workflow";
import { isSupabaseServerConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import type { AttendanceBulkDbPayload } from "@/lib/attendance-bulk-payload-bridge";
import type { Prisma } from "@prisma/client";

const ATTENDANCE_TABLE = "employee_attendance";
const BIOMETRIC_TABLE = "biometric_attendance";

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

async function persistBiometricRowsSupabase(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Record<string, unknown>[]
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  let saved = 0;

  for (const row of rows) {
    try {
      const { error } = await supabase.from(BIOMETRIC_TABLE).upsert(row, {
        onConflict: "employee_id,attendance_date",
      });
      if (error) {
        errors.push(error.message ?? "biometric_attendance upsert failed");
        continue;
      }
      saved += 1;
    } catch (error) {
      console.error("[bulk-import] supabase biometric upsert:", error);
      errors.push(error instanceof Error ? error.message : "biometric upsert failed");
    }
  }

  return { saved, errors };
}

async function persistAttendanceRowsPrisma(
  rows: Prisma.AttendanceCreateManyInput[]
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  if (!prisma || rows.length === 0) return { saved: 0, errors };

  try {
    const result = await prisma.attendance.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return { saved: result.count, errors };
  } catch (error) {
    console.error("[bulk-import] prisma.attendance.createMany failed:", error);
    errors.push(error instanceof Error ? error.message : "prisma createMany failed");

    let saved = 0;
    for (const row of rows) {
      try {
        if (row.employeeId && row.attendanceDate) {
          await prisma.attendance.upsert({
            where: {
              employeeId_attendanceDate: {
                employeeId: row.employeeId,
                attendanceDate: row.attendanceDate,
              },
            },
            create: row,
            update: row,
          });
        } else {
          await prisma.attendance.create({ data: row });
        }
        saved += 1;
      } catch (rowError) {
        console.error("[bulk-import] prisma.attendance upsert row:", rowError);
      }
    }
    return { saved, errors };
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

      const normalized = sanitizeIncomingBulkRow(raw as Record<string, unknown>);
      if (!normalized) {
        rowErrors.push(`Row ${index + 1}: missing employee identity fields.`);
        continue;
      }

      if (!normalized.punch_in) {
        normalized.punch_in = `${normalized.attendance_date || todayIsoDate()}T09:00:00.000Z`;
      }

      normalizedRows.push(normalized);
    } catch (rowError) {
      console.error("[bulk-import] row sanitization error:", rowError);
      rowErrors.push(`Row ${index + 1}: sanitization recovered with skip.`);
    }
  }

  if (normalizedRows.length === 0) {
    return NextResponse.json(
      {
        error: "No valid rows to import.",
        errors: rowErrors,
        debug: {
          cause:
            "All rows failed sanitization — check pay_code, employee_name, or card_number columns.",
          receivedRows: payload.rows.length,
        },
      },
      { status: 400 }
    );
  }

  const records: ReturnType<typeof normalizeAttendanceWorkflowRecord>[] = [];
  const prismaAttendanceRows: Prisma.AttendanceCreateManyInput[] = [];
  const supabaseBiometricRows: Record<string, unknown>[] = [];
  let imported = 0;
  let skipped = 0;
  let provisionedEmployees = 0;
  let biometricSaved = 0;

  const supabaseConfigured = isSupabaseServerConfigured();
  const prismaConfigured = isPrismaConfigured();
  const supabase = supabaseConfigured ? createAdminClient() : null;

  const employeeCache = new Map<string, string>();

  for (const row of normalizedRows) {
    try {
      let resolvedEmployeeId: string | null = null;
      const cacheKey = `${row.pay_code}|${row.employee_name}`.toLowerCase();

      if (supabase) {
        const cached = employeeCache.get(cacheKey);
        if (cached) {
          resolvedEmployeeId = cached;
        } else {
          const resolution = await resolveOrProvisionEmployeeId(supabase, row, {
            autoProvision: true,
          });
          if (!resolution.employeeId) {
            skipped += 1;
            rowErrors.push(
              resolution.error ??
                `${row.employee_name || row.pay_code || row.employee_id}: employee not found.`
            );
            continue;
          }
          resolvedEmployeeId = resolution.employeeId;
          employeeCache.set(cacheKey, resolvedEmployeeId);
          if (resolution.provisioned) provisionedEmployees += 1;
        }
      } else {
        resolvedEmployeeId =
          safeString(row.employee_id) || safeString(row.pay_code) || null;
      }

      const rowDate =
        safeString(row.date) ||
        safeString(row.attendance_date) ||
        todayIsoDate();

      const prismaRow = mapToAttendanceCreate(row, resolvedEmployeeId, rowDate);
      prismaAttendanceRows.push(prismaRow);
      supabaseBiometricRows.push(mapToBiometricAttendanceRow(row, resolvedEmployeeId, rowDate));

      if (!supabaseConfigured) {
        const mapped = bulkRecordToWorkflowFields(sanitizeBulkRowInput(row));
        records.push(
          normalizeAttendanceWorkflowRecord({
            id: `att-bulk-${Date.now()}-${imported}`,
            employeeId: resolvedEmployeeId || row.pay_code,
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
        continue;
      }

      const dbStatus = mapExcelStatusToDbStatus(row.status, row.shift);
      const overtimeShift = resolveOvertimeShiftFromBulkRow(row);
      const overtimeHours = safeBulkNumeric(row.overtime_hours);
      const remarks = row.remarks || "";

      const workflowNotes = {
        ...buildDefaultAttendanceWorkflowNotes(
          row.punch_in,
          row.punch_out,
          row.employee_name || undefined
        ),
        source: "manual" as const,
        manualStatus: safeString(row.status) || row.shift || BIOMETRIC_DAY_CODE,
        overtimeHours,
        overtimeShift: overtimeShift as "DY1" | "G11",
        shiftRemarks: [
          remarks,
          row.srl_number ? `SRL: ${row.srl_number}` : "",
          row.pay_code ? `Pay Code: ${row.pay_code}` : "",
          row.card_number ? `Card No: ${row.card_number}` : "",
          row.hours_worked ? `Hours Worked: ${row.hours_worked}` : "",
          row.overtime_amount ? `Overtime Amount: ${row.overtime_amount}` : "",
          row.over_stay ? `Over Stay: ${row.over_stay}` : "",
          row.manual ? `Manual: ${row.manual}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };

      const { data, error } = await supabase!
        .from(ATTENDANCE_TABLE)
        .upsert(
          {
            employee_id: resolvedEmployeeId,
            attendance_date: row.attendance_date,
            status: dbStatus,
            notes: serializeAttendanceWorkflowNotes(workflowNotes),
          },
          { onConflict: "employee_id,attendance_date" }
        )
        .select("id, employee_id, attendance_date, status")
        .single();

      if (error) {
        console.error("[bulk-import] workflow upsert error:", error);
        skipped += 1;
        rowErrors.push(
          `${row.employee_name || row.pay_code}: ${error.message ?? "workflow insert failed"}`
        );
        continue;
      }

      records.push(
        normalizeAttendanceWorkflowRecord({
          id: String(data.id),
          employeeId: resolvedEmployeeId!,
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
      console.error("[bulk-import] row save error:", rowError);
      skipped += 1;
      rowErrors.push(
        `${row.employee_name || row.pay_code || "Row"}: ${
          rowError instanceof Error ? rowError.message : "insert failed"
        }`
      );
    }
  }

  if (prismaConfigured && prismaAttendanceRows.length > 0) {
    const prismaResult = await persistAttendanceRowsPrisma(prismaAttendanceRows);
    biometricSaved = prismaResult.saved;
    rowErrors.push(...prismaResult.errors);
  } else if (supabase && supabaseBiometricRows.length > 0) {
    const supabaseResult = await persistBiometricRowsSupabase(
      supabase,
      supabaseBiometricRows
    );
    biometricSaved = supabaseResult.saved;
    rowErrors.push(...supabaseResult.errors);
  } else if (!supabaseConfigured) {
    biometricSaved = prismaAttendanceRows.length;
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      ok: true,
      message: "Bulk attendance saved locally (database not configured).",
      imported,
      skipped,
      provisionedEmployees,
      biometricSaved,
      errors: rowErrors,
      records,
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      imported > 0 || biometricSaved > 0
        ? "Bulk attendance import completed."
        : "Bulk import finished with zero saved rows — see errors.",
    imported,
    skipped,
    provisionedEmployees,
    biometricSaved,
    errors: rowErrors.slice(0, 20),
    records,
  });
}
