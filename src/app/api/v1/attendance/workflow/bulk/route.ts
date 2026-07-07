import { NextResponse } from "next/server";
import {
  resolveOrProvisionEmployeeId,
  mapExcelStatusToDbStatus,
  resolveOvertimeShiftFromBulkRow,
} from "@/lib/attendance-bulk-employee-resolver";
import { sanitizeIncomingBulkRow } from "@/lib/attendance-bulk-row-sanitizer";
import {
  persistBiometricRowsResilient,
  persistBiometricRowsSupabaseResilient,
} from "@/lib/attendance-bulk-resilient-persist";
import { virtualBulkRowToDbPayload } from "@/lib/attendance-bulk-virtual-mapper";
import {
  mapToBiometricAttendanceCreate,
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
import { ATTENDANCE_SETUP_MESSAGE } from "@/lib/attendance-setup-messages";
import {
  ensureAttendanceTablesSchema,
  checkAttendanceSchemaReady,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";
import { isPrismaConfigured } from "@/lib/prisma";
import type { AttendanceBulkDbPayload } from "@/lib/attendance-bulk-payload-bridge";
import type { Prisma } from "@prisma/client";

const ATTENDANCE_TABLE = "employee_attendance";

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
const BULK_SAVE_TIMEOUT_MS = 120_000;

export const maxDuration = 120;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function upsertWorkflowChunk(
  supabase: ReturnType<typeof createAdminClient>,
  chunk: Array<{
    employee_id: string;
    attendance_date: string;
    status: string;
    notes: string;
  }>
): Promise<{ saved: number; error?: string }> {
  const { error } = await supabase.from(ATTENDANCE_TABLE).upsert(chunk, {
    onConflict: "employee_id,attendance_date",
  });
  if (error) {
    return { saved: 0, error: error.message ?? "employee_attendance upsert failed" };
  }
  return { saved: chunk.length };
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
  let schemaRetried = false;

  for (const chunk of chunkArray(rows, BATCH_SIZE)) {
    try {
      let result = await upsertWorkflowChunk(supabase, chunk);

      if (
        result.error &&
        isAttendanceSchemaError(result.error) &&
        !schemaRetried
      ) {
        const ensure = await ensureAttendanceTablesSchema();
        schemaRetried = true;
        if (ensure.ok) {
          result = await upsertWorkflowChunk(supabase, chunk);
        } else {
          errors.push(ATTENDANCE_SETUP_MESSAGE);
          continue;
        }
      }

      if (result.error) {
        errors.push(result.error);
        continue;
      }
      saved += result.saved;
    } catch (error) {
      console.error("[bulk-import] employee_attendance batch upsert:", error);
      const message =
        error instanceof Error ? error.message : "employee_attendance upsert failed";
      if (isAttendanceSchemaError(message) && !schemaRetried) {
        const ensure = await ensureAttendanceTablesSchema();
        schemaRetried = true;
        if (!ensure.ok) {
          errors.push(ATTENDANCE_SETUP_MESSAGE);
          continue;
        }
        try {
          const retry = await upsertWorkflowChunk(supabase, chunk);
          if (retry.error) {
            errors.push(retry.error);
          } else {
            saved += retry.saved;
          }
          continue;
        } catch (retryError) {
          errors.push(
            retryError instanceof Error ? retryError.message : "employee_attendance upsert failed"
          );
          continue;
        }
      }
      errors.push(message);
    }
  }

  return { saved, errors };
}

async function withBulkSaveTimeout<T>(operation: () => Promise<T>): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Bulk attendance save timed out after 120 seconds."));
      }, BULK_SAVE_TIMEOUT_MS);
    }),
  ]);
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

  if (isSupabaseServerConfigured()) {
    const schemaProbe = await checkAttendanceSchemaReady();
    if (!schemaProbe.ready) {
      const schemaEnsure = await ensureAttendanceTablesSchema();
      console.log(
        "[bulk-import] attendance schema ensure:",
        schemaEnsure.ok ? "ok" : schemaEnsure.message
      );
    }
  }

  const normalizedRows: AttendanceBulkDbPayload[] = [];
  const rowErrors: string[] = [];

  for (let index = 0; index < payload.rows.length; index += 1) {
    try {
      const raw = payload.rows[index];
      if (!raw || typeof raw !== "object") {
        rowErrors.push(`Row ${index + 1}: invalid row object — recovered with defaults.`);
        normalizedRows.push(
          sanitizeIncomingBulkRow({}) as AttendanceBulkDbPayload
        );
        continue;
      }

      const rawRow = raw as Record<string, unknown>;
      const defaultDate = normalizeAttendanceDateIso(
        safeString(rawRow.date) ||
          safeString(rawRow.attendance_date) ||
          todayIsoDate()
      );

      const normalized =
        virtualBulkRowToDbPayload(
          { ...rawRow, date: rawRow.date ?? defaultDate },
          { defaultDate }
        ) ?? sanitizeIncomingBulkRow(rawRow);

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
      normalizedRows.push(
        sanitizeIncomingBulkRow({}) as AttendanceBulkDbPayload
      );
      rowErrors.push(`Row ${index + 1}: sanitization recovered with defaults.`);
    }
  }

  if (normalizedRows.length === 0) {
    return NextResponse.json(
      {
        error: "No valid rows to import.",
        errors: rowErrors,
        debug: {
          cause: "All rows failed sanitization.",
          receivedRows: payload.rows.length,
        },
      },
      { status: 400 }
    );
  }

  try {
    return await withBulkSaveTimeout(async () => {
  const supabaseConfigured = isSupabaseServerConfigured();
  const prismaConfigured = isPrismaConfigured();
  const supabase = supabaseConfigured ? createAdminClient() : null;
  let sqlTablesReady = true;

  if (supabase) {
    const schemaProbe = await checkAttendanceSchemaReady();
    if (!schemaProbe.ready) {
      const ensure = await ensureAttendanceTablesSchema();
      sqlTablesReady = ensure.ok;
      console.log(
        "[bulk-import] attendance schema ensure:",
        ensure.ok ? "ok" : ensure.message
      );
    }
  }

  /** SQL tables required — no cloud storage fallback. */
  if (supabase && !sqlTablesReady) {
    return NextResponse.json(
      {
        ok: false,
        error: ATTENDANCE_SETUP_MESSAGE,
        hint: ATTENDANCE_SETUP_MESSAGE,
        setupRequired: true,
        imported: 0,
        skipped: normalizedRows.length,
        biometricSaved: 0,
        errors: [ATTENDANCE_SETUP_MESSAGE],
      },
      { status: 503 }
    );
  }

  const records: ReturnType<typeof normalizeAttendanceWorkflowRecord>[] = [];
  const prismaBiometricRows: Prisma.BiometricAttendanceCreateManyInput[] = [];
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
  let savedReportDate: string | undefined;

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
          if (resolution.employeeId) {
            resolvedEmployeeId = resolution.employeeId;
            employeeCache.set(cacheKey, resolvedEmployeeId);
            if (resolution.provisioned) provisionedEmployees += 1;
          } else {
            skipped += 1;
            rowErrors.push(
              resolution.error ??
                `${row.employee_name || row.pay_code || row.employee_id}: employee not found — biometric row still saved.`
            );
          }
        }
      } else {
        resolvedEmployeeId =
          safeString(row.employee_id) || safeString(row.pay_code) || null;
      }

      const rowDate = normalizeAttendanceDateIso(
        safeString(row.date) || safeString(row.attendance_date)
      );

      const prismaRow = mapToBiometricAttendanceCreate(row, resolvedEmployeeId, rowDate);
      prismaBiometricRows.push(prismaRow);
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

      if (!resolvedEmployeeId) {
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
        employee_id: resolvedEmployeeId,
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

  if (supabase && sqlTablesReady && workflowUpsertRows.length > 0) {
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

  if (sqlTablesReady && prismaConfigured && prismaBiometricRows.length > 0) {
    const prismaResult = await persistBiometricRowsResilient(prismaBiometricRows, BATCH_SIZE);
    biometricSaved = prismaResult.saved;
    rowErrors.push(...prismaResult.errors);
  } else if (sqlTablesReady && supabase && supabaseBiometricRows.length > 0) {
    const supabaseResult = await persistBiometricRowsSupabaseResilient(
      supabase,
      supabaseBiometricRows,
      BATCH_SIZE
    );
    biometricSaved = supabaseResult.saved;
    rowErrors.push(...supabaseResult.errors);
  } else if (!supabaseConfigured) {
    biometricSaved = prismaBiometricRows.length;
  }

  if (
    supabase &&
    imported === 0 &&
    biometricSaved === 0 &&
    supabaseBiometricRows.length > 0 &&
    rowErrors.some((entry) => isAttendanceSchemaError(entry))
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: ATTENDANCE_SETUP_MESSAGE,
        hint: ATTENDANCE_SETUP_MESSAGE,
        setupRequired: true,
        imported: 0,
        skipped,
        provisionedEmployees,
        biometricSaved: 0,
        errors: [ATTENDANCE_SETUP_MESSAGE],
        records: [],
      },
      { status: 503 }
    );
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
    savedReportDate,
    errors: rowErrors.slice(0, 20),
    records,
  });
    });
  } catch (error) {
    console.error("[bulk-import] bulk save interceptor:", error);
    const message =
      error instanceof Error ? error.message : "Bulk attendance save failed.";
    const timedOut = message.toLowerCase().includes("timed out");
    return NextResponse.json(
      {
        error: message,
        ok: false,
        debug: {
          cause: timedOut
            ? "Bulk save exceeded 120-second limit — rows were not fully persisted."
            : "Bulk save failed during database transaction.",
        },
      },
      { status: timedOut ? 504 : 500 }
    );
  }
}
