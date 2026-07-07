import { INITIAL_INGEST_PIPELINE_STAGE } from "@/types/attendance-pipeline";
import { normalizeAttendanceDateIso } from "@/types/attendance-bulk-import-row";

export type BulkMergeStats = {
  inserted: number;
  merged: number;
  skipped: number;
};

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

/** Stable lookup key for payCode + attendance date. */
export function bulkMergeKey(payCode: unknown, date: unknown): string {
  const code = safeString(payCode).toLowerCase();
  const day = normalizeAttendanceDateIso(date);
  return `${code}|${day}`;
}

/** True when a time or hours field is missing or placeholder-only. */
export function isBlankAttendanceTime(value: unknown): boolean {
  const token = safeString(value);
  if (!token) return true;
  const normalized = token.toLowerCase();
  return normalized === "0" || normalized === "-" || normalized === "—" || normalized === "00:00";
}

function readRowStage(row: Record<string, unknown>): string {
  return safeString(row.pipeline_stage ?? row.pipelineStage) || INITIAL_INGEST_PIPELINE_STAGE;
}

function readOutTime(row: Record<string, unknown>): string {
  return safeString(row.out_time ?? row.outTime ?? row.out);
}

function readDuration(row: Record<string, unknown>): string {
  return safeString(
    row.duration ?? row.total_hours ?? row.totalHours ?? row.gross_hours ?? row.grossHours
  );
}

/** Fields that may be filled from an evening re-import when blank on an existing row. */
export function buildEveningMergePatch(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> | null {
  if (readRowStage(existing) !== INITIAL_INGEST_PIPELINE_STAGE) {
    return null;
  }

  const patch: Record<string, unknown> = {};
  const incomingOut = readOutTime(incoming);
  const incomingDuration = readDuration(incoming);

  if (isBlankAttendanceTime(readOutTime(existing)) && !isBlankAttendanceTime(incomingOut)) {
    patch.out_time = incomingOut;
    patch.outTime = incomingOut;
  }

  if (isBlankAttendanceTime(readDuration(existing)) && !isBlankAttendanceTime(incomingDuration)) {
    patch.duration = incomingDuration;
    patch.gross_hours = incomingDuration;
    patch.grossHours = incomingDuration;
    patch.net_hours = incomingDuration;
    patch.netHours = incomingDuration;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/** Prisma camelCase patch for an existing biometric row. */
export function buildEveningMergePatchPrisma(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> | null {
  const snakePatch = buildEveningMergePatch(existing, incoming);
  if (!snakePatch) return null;

  const prismaPatch: Record<string, unknown> = {};
  if (snakePatch.out_time != null) prismaPatch.outTime = snakePatch.out_time;
  if (snakePatch.duration != null) {
    prismaPatch.duration = snakePatch.duration;
    prismaPatch.grossHours = snakePatch.duration;
    prismaPatch.netHours = snakePatch.duration;
  }
  return Object.keys(prismaPatch).length > 0 ? prismaPatch : null;
}

export function mergeIncomingIntoStorageRow(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): { row: Record<string, unknown>; merged: boolean } {
  const patch = buildEveningMergePatch(existing, incoming);
  if (!patch) {
    return { row: existing, merged: false };
  }
  return {
    row: { ...existing, ...patch },
    merged: true,
  };
}

export function createInitialMergeStats(): BulkMergeStats {
  return { inserted: 0, merged: 0, skipped: 0 };
}
