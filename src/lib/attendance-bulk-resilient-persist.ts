import type { Prisma } from "@prisma/client";
import {
  ensureAttendanceTablesSchema,
  formatSchemaEnsureFailureMessage,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";
import { normalizeAttendanceDateIso, todayIsoDateString } from "@/types/attendance-bulk-import-row";
import { prisma } from "@/lib/prisma";

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

/** Force-safe defaults on every biometric column before DB write — no validation traps. */
export function sanitizeBiometricCreateRow(
  row: Prisma.BiometricAttendanceCreateManyInput
): Prisma.BiometricAttendanceCreateManyInput {
  try {
    const date =
      normalizeAttendanceDateIso(row.date, todayIsoDateString()) || todayIsoDateString();

    return {
      srlNo: row.srlNo ?? null,
      payCode: safeString(row.payCode) || "UNKNOWN",
      cardNo: safeString(row.cardNo) || "",
      employeeName: safeString(row.employeeName) || "",
      department: safeString(row.department) || "",
      designation: safeString(row.designation) || "",
      shift: safeString(row.shift) || "",
      date,
      status: safeString(row.status) || "",
      inTime: safeString(row.inTime) || "",
      outTime: safeString(row.outTime) || "",
      duration: safeString(row.duration) || "0",
      earlyIn: safeString(row.earlyIn) || "0",
      lateIn: safeString(row.lateIn) || "0",
      earlyOut: safeString(row.earlyOut) || "0",
      lateOut: safeString(row.lateOut) || "0",
      otHours: safeString(row.otHours) || "0",
      shortHours: safeString(row.shortHours) || "0",
      grossHours: safeString(row.grossHours) || "0",
      netHours: safeString(row.netHours) || "0",
      workCode: safeString(row.workCode) || "",
      remark: safeString(row.remark) || "",
    };
  } catch {
    return {
      payCode: "UNKNOWN",
      date: todayIsoDateString(),
      duration: "0",
      earlyIn: "0",
      lateIn: "0",
      earlyOut: "0",
      lateOut: "0",
      otHours: "0",
      shortHours: "0",
      grossHours: "0",
      netHours: "0",
    };
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** createMany with per-row fallback — corrupted rows are skipped, clean rows always commit. */
export async function persistBiometricRowsResilient(
  rows: Prisma.BiometricAttendanceCreateManyInput[],
  batchSize = 50
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  if (!prisma || rows.length === 0) return { saved: 0, errors };

  const sanitized = rows.map((row) => sanitizeBiometricCreateRow(row));
  let saved = 0;

  try {
    for (const chunk of chunkArray(sanitized, batchSize)) {
      try {
        const result = await prisma.biometricAttendance.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        saved += result.count;
      } catch (chunkError) {
        console.error("[bulk-import] createMany chunk failed, row fallback:", chunkError);
        for (const row of chunk) {
          try {
            await prisma.biometricAttendance.create({ data: row });
            saved += 1;
          } catch (rowError) {
            const label = `${row.payCode ?? "?"}@${row.date ?? "?"}`;
            errors.push(
              `${label}: ${
                rowError instanceof Error ? rowError.message : "row insert failed"
              }`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("[bulk-import] persistBiometricRowsResilient outer:", error);
    errors.push(error instanceof Error ? error.message : "biometric persist failed");
  }

  return { saved, errors };
}

async function upsertBiometricChunk(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  chunk: Record<string, unknown>[]
): Promise<{ error?: string }> {
  const { error } = await supabase.from("biometric_attendance").upsert(chunk, {
    onConflict: "pay_code,date",
  });
  return error ? { error: error.message ?? "batch upsert failed" } : {};
}

/** Supabase upsert with per-row fallback when batch conflict fails. */
export async function persistBiometricRowsSupabaseResilient(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  rows: Record<string, unknown>[],
  batchSize = 50
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  let saved = 0;
  let schemaRetried = false;

  for (const chunk of chunkArray(rows, batchSize)) {
    try {
      let batch = await upsertBiometricChunk(supabase, chunk);

      if (batch.error && isAttendanceSchemaError(batch.error) && !schemaRetried) {
        const ensure = await ensureAttendanceTablesSchema();
        schemaRetried = true;
        if (ensure.ok) {
          batch = await upsertBiometricChunk(supabase, chunk);
        } else {
          errors.push(formatSchemaEnsureFailureMessage(batch.error));
          continue;
        }
      }

      if (batch.error) {
        for (const row of chunk) {
          try {
            const { error: rowError } = await supabase
              .from("biometric_attendance")
              .upsert(row, { onConflict: "pay_code,date" });
            if (rowError) {
              errors.push(rowError.message ?? "row upsert failed");
              continue;
            }
            saved += 1;
          } catch (inner) {
            errors.push(inner instanceof Error ? inner.message : "row upsert failed");
          }
        }
        continue;
      }
      saved += chunk.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "batch upsert failed";
      if (isAttendanceSchemaError(message) && !schemaRetried) {
        const ensure = await ensureAttendanceTablesSchema();
        schemaRetried = true;
        if (!ensure.ok) {
          errors.push(formatSchemaEnsureFailureMessage(message));
          continue;
        }
        try {
          const retry = await upsertBiometricChunk(supabase, chunk);
          if (retry.error) {
            errors.push(retry.error);
          } else {
            saved += chunk.length;
          }
          continue;
        } catch (retryError) {
          errors.push(
            retryError instanceof Error ? retryError.message : "batch upsert failed"
          );
          continue;
        }
      }
      errors.push(message);
    }
  }

  return { saved, errors };
}
