import {
  bulkRecordFromHeaderMap,
  buildHeaderColumnMap,
  countMappedHeaders,
  fuzzyHeaderToken,
  normalizeHeaderKey,
  type BiometricColumnKey,
} from "@/lib/attendance-bulk-header-normalizer";
import {
  bulkRecordFromCells,
  normalizeAttendanceDateIso,
  normalizeBiometric23ColumnRecord,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";

export type BiometricColumnStructure = "excel-22" | "grid-23" | "flexible";

function safeCell(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

/** Strip trailing empty/hash columns — no length validation. */
export function trimTrailingEmptyCells(row: unknown[]): unknown[] {
  try {
    const copy = [...row];
    while (copy.length > 0) {
      const last = safeCell(copy[copy.length - 1]);
      if (last && last !== "#") break;
      if (!last) {
        copy.pop();
        continue;
      }
      break;
    }
    return copy;
  } catch {
    return Array.isArray(row) ? row : [];
  }
}

/** @deprecated No-op — column length never blocks import. */
export function isFlexibleColumnCount(_length: number): boolean {
  return true;
}

/** Apply numeric insulation — empty fields default to "0". */
export function applyBulkNumericInsulation(
  record: Biometric23ColumnRecord
): Biometric23ColumnRecord {
  return {
    ...record,
    earlyArrival: safeCell(record.earlyArrival) || "0",
    shiftLate: safeCell(record.shiftLate) || "0",
    shiftEarly: safeCell(record.shiftEarly) || "0",
    excessLunch: safeCell(record.excessLunch) || "0",
    ot: safeCell(record.ot) || "0",
    overtimeAmount: safeCell(record.overtimeAmount) || "0",
    overStay: safeCell(record.overStay) || "0",
    manual: safeCell(record.manual) || "0",
  };
}

function mergeRecords(
  base: Biometric23ColumnRecord,
  overlay: Biometric23ColumnRecord
): Biometric23ColumnRecord {
  const merged: Partial<Biometric23ColumnRecord> = { ...base };
  for (const [key, value] of Object.entries(overlay) as Array<
    [keyof Biometric23ColumnRecord, string]
  >) {
    if (safeCell(value)) {
      merged[key] = value;
    }
  }
  return merged as Biometric23ColumnRecord;
}

/** Positional mapper — delegates to bulkRecordFromCells (no length gates). */
export function flexibleBulkRecordFromCells(
  cells: unknown,
  defaultDate?: string
): Biometric23ColumnRecord {
  return bulkRecordFromCells(cells, defaultDate);
}

/** @deprecated Structure detection removed — always returns flexible. */
export function detectBiometricColumnStructure(
  _columnMap: Partial<Record<BiometricColumnKey, number>>,
  _sampleRow?: unknown[]
): BiometricColumnStructure {
  return "flexible";
}

/** Primary engine — merges header map + positional cells; never throws or blocks on column count. */
export function resolveFlexibleBulkRecord(
  rawRow: unknown,
  options: {
    columnMap: Partial<Record<BiometricColumnKey, number>>;
    headers?: string[];
    reportDate?: string;
    useHeaderMapping?: boolean;
    structure?: BiometricColumnStructure;
  }
): Biometric23ColumnRecord {
  try {
    const fallbackDate = normalizeAttendanceDateIso(options.reportDate);
    const fromCells = applyBulkNumericInsulation(
      normalizeBiometric23ColumnRecord(
        flexibleBulkRecordFromCells(rawRow, fallbackDate),
        { defaultDate: fallbackDate }
      )
    );

    if (countMappedHeaders(options.columnMap) === 0) {
      return fromCells;
    }

    const fromHeaders = bulkRecordFromHeaderMap(rawRow, options.columnMap, fallbackDate);
    fromHeaders.date = normalizeAttendanceDateIso(fromHeaders.date, fallbackDate);

    return applyBulkNumericInsulation(
      normalizeBiometric23ColumnRecord(
        mergeRecords(fromCells, fromHeaders),
        { defaultDate: fallbackDate }
      )
    );
  } catch (error) {
    console.error("[flexible-alignment] resolveFlexibleBulkRecord failed:", error);
    return applyBulkNumericInsulation(
      normalizeBiometric23ColumnRecord(null, {
        defaultDate: normalizeAttendanceDateIso(options.reportDate),
      })
    );
  }
}

/** @deprecated Use resolveFlexibleBulkRecord */
export const resolveBulkRecordFromDynamicRow = resolveFlexibleBulkRecord;

/** Informational only — never implies failure or column-count mismatch. */
export function formatFlexibleAlignmentInfo(
  _columnMap: Partial<Record<BiometricColumnKey, number>>,
  reportDate?: string
): string {
  const resolvedDate = normalizeAttendanceDateIso(reportDate);
  return `Import ready: automatic field mapping active; report date ${resolvedDate} applied when needed.`;
}

/** @deprecated Use formatFlexibleAlignmentInfo */
export const formatHeaderAlignmentMessage = formatFlexibleAlignmentInfo;

export function headerLooksLikeBiometricRow(headers: string[]): boolean {
  try {
    const probe = headers.map((h) => fuzzyHeaderToken(h)).join("|");
    return probe.includes("paycode") || probe.includes("srlno") || probe.includes("employeename");
  } catch {
    return false;
  }
}

/** Always attempt header mapping when any header token matches. */
export function shouldUseHeaderMapping(
  columnMap: Partial<Record<BiometricColumnKey, number>>
): boolean {
  return countMappedHeaders(columnMap) >= 1;
}

export { buildHeaderColumnMap, countMappedHeaders };
