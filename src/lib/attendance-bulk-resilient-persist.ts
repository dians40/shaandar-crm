import type { Prisma } from "@prisma/client";
import {
  ensureAttendanceTablesSchema,
  formatSchemaEnsureFailureMessage,
  isAttendanceSchemaError,
} from "@/lib/attendance-schema-ensure";
import {
  bulkMergeKey,
  buildEveningMergePatch,
  buildEveningMergePatchPrisma,
  createInitialMergeStats,
  type BulkMergeStats,
} from "@/lib/attendance-bulk-smart-merge";
import { INITIAL_INGEST_PIPELINE_STAGE } from "@/types/attendance-pipeline";
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
      pipelineStage: row.pipelineStage ?? INITIAL_INGEST_PIPELINE_STAGE,
      workflowStage: row.workflowStage ?? "pending_allocation",
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
      pipelineStage: INITIAL_INGEST_PIPELINE_STAGE,
      workflowStage: "pending_allocation",
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

async function fetchExistingPrismaRows(
  rows: Prisma.BiometricAttendanceCreateManyInput[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (!prisma || rows.length === 0) return map;

  const keys = rows
    .map((row) => ({
      payCode: safeString(row.payCode),
      date: normalizeAttendanceDateIso(row.date),
    }))
    .filter((entry) => entry.payCode && entry.date);

  if (keys.length === 0) return map;

  const uniqueDates = [...new Set(keys.map((entry) => entry.date))];
  const payCodes = [...new Set(keys.map((entry) => entry.payCode))];

  const existing = await prisma.biometricAttendance.findMany({
    where: {
      payCode: { in: payCodes },
      date: { in: uniqueDates },
    },
    select: {
      id: true,
      payCode: true,
      date: true,
      outTime: true,
      duration: true,
      grossHours: true,
      netHours: true,
      department: true,
      designation: true,
      pipelineStage: true,
    },
  });

  for (const row of existing) {
    map.set(bulkMergeKey(row.payCode, row.date), row as unknown as Record<string, unknown>);
  }

  return map;
}

/** Smart merge: insert new evening labours, patch blank out_time/hours on staging rows only. */
export async function persistBiometricRowsResilient(
  rows: Prisma.BiometricAttendanceCreateManyInput[],
  batchSize = 50
): Promise<{ saved: number; errors: string[]; mergeStats: BulkMergeStats }> {
  const errors: string[] = [];
  const mergeStats = createInitialMergeStats();
  if (!prisma || rows.length === 0) return { saved: 0, errors, mergeStats };

  const sanitized = rows.map((row) => sanitizeBiometricCreateRow(row));
  let saved = 0;

  try {
    const existingMap = await fetchExistingPrismaRows(sanitized);
    const toInsert: Prisma.BiometricAttendanceCreateManyInput[] = [];
    const toPatch: { id: string; data: Record<string, unknown> }[] = [];

    for (const incoming of sanitized) {
      const key = bulkMergeKey(incoming.payCode, incoming.date);
      const existing = existingMap.get(key);

      if (!existing) {
        toInsert.push(incoming);
        mergeStats.inserted += 1;
        continue;
      }

      const patch = buildEveningMergePatchPrisma(existing, incoming as Record<string, unknown>);
      if (patch && existing.id) {
        toPatch.push({ id: String(existing.id), data: patch });
        mergeStats.merged += 1;
      } else {
        mergeStats.skipped += 1;
      }
    }

    for (const chunk of chunkArray(toInsert, batchSize)) {
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

    for (const { id, data } of toPatch) {
      try {
        await prisma.biometricAttendance.update({
          where: { id },
          data: data as Prisma.BiometricAttendanceUpdateInput,
        });
        saved += 1;
      } catch (patchError) {
        errors.push(
          patchError instanceof Error ? patchError.message : "evening merge patch failed"
        );
      }
    }
  } catch (error) {
    console.error("[bulk-import] persistBiometricRowsResilient outer:", error);
    errors.push(error instanceof Error ? error.message : "biometric persist failed");
  }

  return { saved, errors, mergeStats };
}

async function fetchExistingSupabaseRows(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  rows: Record<string, unknown>[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (rows.length === 0) return map;

  const payCodes = [
    ...new Set(
      rows
        .map((row) => safeString(row.pay_code ?? row.payCode))
        .filter(Boolean)
    ),
  ];
  const dates = [
    ...new Set(
      rows
        .map((row) => normalizeAttendanceDateIso(row.date))
        .filter(Boolean)
    ),
  ];

  if (payCodes.length === 0 || dates.length === 0) return map;

  const { data, error } = await supabase
    .from("biometric_attendance")
    .select("id, pay_code, date, out_time, duration, gross_hours, net_hours, department, designation, pipeline_stage")
    .in("pay_code", payCodes)
    .in("date", dates);

  if (error) {
    throw new Error(error.message ?? "existing row lookup failed");
  }

  for (const row of data ?? []) {
    map.set(
      bulkMergeKey((row as Record<string, unknown>).pay_code, (row as Record<string, unknown>).date),
      row as Record<string, unknown>
    );
  }

  return map;
}

/** Supabase smart merge — never overwrites department/designation on existing rows. */
export async function persistBiometricRowsSupabaseResilient(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  rows: Record<string, unknown>[],
  batchSize = 50
): Promise<{ saved: number; errors: string[]; mergeStats: BulkMergeStats }> {
  const errors: string[] = [];
  const mergeStats = createInitialMergeStats();
  let saved = 0;
  let schemaRetried = false;

  for (const chunk of chunkArray(rows, batchSize)) {
    try {
      let existingMap: Map<string, Record<string, unknown>>;
      try {
        existingMap = await fetchExistingSupabaseRows(supabase, chunk);
      } catch (lookupError) {
        const message = lookupError instanceof Error ? lookupError.message : "lookup failed";
        if (isAttendanceSchemaError(message) && !schemaRetried) {
          const ensure = await ensureAttendanceTablesSchema();
          schemaRetried = true;
          if (!ensure.ok) {
            errors.push(formatSchemaEnsureFailureMessage(message));
            continue;
          }
          existingMap = await fetchExistingSupabaseRows(supabase, chunk);
        } else {
          throw lookupError;
        }
      }

      const toInsert: Record<string, unknown>[] = [];
      const toPatch: { id: string; patch: Record<string, unknown> }[] = [];

      for (const incoming of chunk) {
        const key = bulkMergeKey(incoming.pay_code ?? incoming.payCode, incoming.date);
        const existing = existingMap.get(key);

        if (!existing) {
          toInsert.push({
            ...incoming,
            pipeline_stage: incoming.pipeline_stage ?? INITIAL_INGEST_PIPELINE_STAGE,
          });
          mergeStats.inserted += 1;
          continue;
        }

        const patch = buildEveningMergePatch(existing, incoming);
        if (patch && existing.id) {
          toPatch.push({ id: String(existing.id), patch });
          mergeStats.merged += 1;
        } else {
          mergeStats.skipped += 1;
        }
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from("biometric_attendance").insert(toInsert);
        if (insertError) {
          for (const row of toInsert) {
            try {
              const { error: rowError } = await supabase.from("biometric_attendance").insert(row);
              if (rowError) {
                errors.push(rowError.message ?? "row insert failed");
                continue;
              }
              saved += 1;
            } catch (inner) {
              errors.push(inner instanceof Error ? inner.message : "row insert failed");
            }
          }
        } else {
          saved += toInsert.length;
        }
      }

      for (const { id, patch } of toPatch) {
        const { error: patchError } = await supabase
          .from("biometric_attendance")
          .update(patch)
          .eq("id", id)
          .eq("pipeline_stage", INITIAL_INGEST_PIPELINE_STAGE);

        if (patchError) {
          errors.push(patchError.message ?? "evening merge patch failed");
          continue;
        }
        saved += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "batch smart merge failed";
      if (isAttendanceSchemaError(message) && !schemaRetried) {
        const ensure = await ensureAttendanceTablesSchema();
        schemaRetried = true;
        if (!ensure.ok) {
          errors.push(formatSchemaEnsureFailureMessage(message));
          continue;
        }
      }
      errors.push(message);
    }
  }

  return { saved, errors, mergeStats };
}
