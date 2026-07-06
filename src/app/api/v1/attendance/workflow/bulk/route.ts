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
import { bulkRecordToWorkflowFields, normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";
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

const BATCH_SIZE = 50;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isMissingDateColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("date") && (lower.includes("column") || lower.includes("schema cache"));
}

async function persistBiometricRowsSupabase(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Record<string, unknown>[]
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  let saved = 0;

  for (const chunk of chunkArray(rows, BATCH_SIZE)) {
    try {
      const { error } = await supabase.from(BIOMETRIC_TABLE).upsert(chunk, {
        onConflict: "employee_id,attendance_date",
      });
      if (error) {
        if (isMissingDateColumnError(error.message ?? "")) {
          const legacyChunk = chunk.map((row) => {
            const { date: _date, ...legacy } = row;
            return legacy;
          });
          const { error: legacyError } = await supabase.from(BIOMETRIC_TABLE).upsert(legacyChunk, {
            onConflict: "employee_id,attendance_date",
          });
          if (legacyError) {
            errors.push(legacyError.message ?? "biometric_attendance upsert failed");
            continue;
          }
          saved += legacyChunk.length;
          continue;
        }
        errors.push(error.message ?? "biometric_attendance upsert failed");
        continue;
      }
      saved += chunk.length;
    } catch (error) {
      console.error("[bulk-import] supabase biometric upsert:", error);
      errors.push(error instanceof Error ? error.message : "biometric upsert failed");
    }
  }

  return { saved, errors };
}

async function persistWorkflowRowsSupabase(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Array<{
    employee_id: string;
    attendance_date: string;
    status: string;
    notes: string;
  }>
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  let saved = 0;

  for (const chunk of chunkArray(rows, BATCH_SIZE)) {
    try {
      const { error } = await supabase.from(ATTENDANCE_TABLE).upsert(chunk, {
        onConflict: "employee_id,attendance_date",
      });
      if (error) {
        errors.push(error.message ?? "employee_attendance upsert failed");
        continue;
      }
      saved += chunk.length;
    } catch (error) {
      console.error("[bulk-import] employee_attendance batch upsert:", error);
      errors.push(error instanceof Error ? error.message : "employee_attendance upsert failed");
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

      normalized.attendance_date = normalizeAttendanceDateIso(normalized.attendance_date);
      normalized.date = normalizeAttendanceDateIso(
        normalized.date || normalized.attendance_date
      );

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
  const workflowUpsertRows: Array<{
    employee_id: string;
    attendance_date: string;
    status: string;
    notes: string;
    rowMeta: AttendanceBulkDbPayload;
  }> = [];
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

      const rowDate = normalizeAttendanceDateIso(
        safeString(row.date) || safeString(row.attendance_date)
      );

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
            attendanceDate: rowDate,
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

      workflowUpsertRows.push({
        employee_id: resolvedEmployeeId!,
        attendance_date: rowDate,
        status: dbStatus,
        notes: serializeAttendanceWorkflowNotes(workflowNotes),
        rowMeta: row,
      });
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

  if (supabase && workflowUpsertRows.length > 0) {
    const workflowResult = await persistWorkflowRowsSupabase(
      supabase,
      workflowUpsertRows.map(({ employee_id, attendance_date, status, notes }) => ({
        employee_id,
        attendance_date,
        status,
        notes,
      }))
    );
    imported = workflowResult.saved;
    rowErrors.push(...workflowResult.errors);

    for (const workflowRow of workflowUpsertRows) {
      records.push(
        normalizeAttendanceWorkflowRecord({
          id: `att-bulk-${workflowRow.employee_id}-${workflowRow.attendance_date}`,
          employeeId: workflowRow.employee_id,
          employeeName: workflowRow.rowMeta.employee_name,
          attendanceDate: workflowRow.attendance_date,
          punchIn: workflowRow.rowMeta.punch_in,
          punchOut: workflowRow.rowMeta.punch_out,
          assignedMachine: workflowRow.rowMeta.remarks,
          workflowStage: "pending_allocation",
          source: "manual",
        })
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
