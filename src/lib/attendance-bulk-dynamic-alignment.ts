import {
  bulkRecordFromHeaderMap,
  buildHeaderColumnMap,
  countMappedHeaders,
  shouldUseHeaderMapping,
  type BiometricColumnKey,
} from "@/lib/attendance-bulk-header-normalizer";
import {
  bulkRecordFromCells,
  normalizeAttendanceDateIso,
  normalizeBiometric23ColumnRecord,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";

export const EXCEL_BIOMETRIC_COLUMN_COUNT = 22;
export const GRID_BIOMETRIC_COLUMN_COUNT = 23;

export type BiometricColumnStructure = "excel-22" | "grid-23";

/** Detect whether incoming sheet rows are 22-col Excel or 23-col grid (with explicit date). */
export function detectBiometricColumnStructure(
  columnMap: Partial<Record<BiometricColumnKey, number>>,
  sampleRow?: unknown[]
): BiometricColumnStructure {
  try {
    const hasDateHeader = columnMap.date != null;
    const rowLength = Array.isArray(sampleRow) ? sampleRow.length : 0;
    const mappedCount = countMappedHeaders(columnMap);

    if (hasDateHeader) return "grid-23";
    if (rowLength >= GRID_BIOMETRIC_COLUMN_COUNT) {
      const dateCell = String(sampleRow?.[7] ?? "").trim();
      if (dateCell) return "grid-23";
    }
    if (mappedCount >= EXCEL_BIOMETRIC_COLUMN_COUNT && !hasDateHeader) {
      return "excel-22";
    }
    return rowLength >= GRID_BIOMETRIC_COLUMN_COUNT ? "grid-23" : "excel-22";
  } catch {
    return "excel-22";
  }
}

/** Permanent dynamic resolver — handles 22-col Excel and 23-col grid without losing date integrity. */
export function resolveBulkRecordFromDynamicRow(
  rawRow: unknown,
  options: {
    columnMap: Partial<Record<BiometricColumnKey, number>>;
    reportDate?: string;
    useHeaderMapping: boolean;
    structure?: BiometricColumnStructure;
  }
): Biometric23ColumnRecord {
  try {
    const structure =
      options.structure ??
      detectBiometricColumnStructure(options.columnMap, Array.isArray(rawRow) ? rawRow : []);

    const fallbackDate = normalizeAttendanceDateIso(options.reportDate);

    if (options.useHeaderMapping) {
      const record = bulkRecordFromHeaderMap(rawRow, options.columnMap, fallbackDate);

      if (structure === "excel-22" || !record.date) {
        record.date = normalizeAttendanceDateIso(record.date, fallbackDate);
      }

      return normalizeBiometric23ColumnRecord(record, { defaultDate: fallbackDate });
    }

    if (structure === "grid-23") {
      return bulkRecordFromCells(rawRow, fallbackDate);
    }

    return bulkRecordFromCells(rawRow, fallbackDate);
  } catch (error) {
    console.error("[dynamic-alignment] resolveBulkRecordFromDynamicRow failed:", error);
    return normalizeBiometric23ColumnRecord(null, {
      defaultDate: normalizeAttendanceDateIso(options.reportDate),
    });
  }
}

/** User-facing alignment summary — 22/23 is expected for Excel, not an error. */
export function formatHeaderAlignmentMessage(
  columnMap: Partial<Record<BiometricColumnKey, number>>,
  reportDate?: string,
  structure?: BiometricColumnStructure
): string {
  const mapped = countMappedHeaders(columnMap);
  const mode =
    structure ?? detectBiometricColumnStructure(columnMap);
  const resolvedDate = normalizeAttendanceDateIso(reportDate);
  const hasDateColumn = columnMap.date != null;

  if (hasDateColumn && mapped >= GRID_BIOMETRIC_COLUMN_COUNT) {
    return "Dynamic alignment complete: all 23 biometric columns mapped from sheet headers.";
  }

  if (mode === "excel-22" && mapped >= EXCEL_BIOMETRIC_COLUMN_COUNT) {
    return `Dynamic alignment complete: ${mapped} Excel columns mapped; Date (${resolvedDate}) injected for 23-column storage.`;
  }

  if (mapped >= EXCEL_BIOMETRIC_COLUMN_COUNT) {
    return `Dynamic alignment complete: ${mapped} columns mapped; Date (${resolvedDate}) preserved for date-wise queries.`;
  }

  return `Dynamic alignment: ${mapped} of ${GRID_BIOMETRIC_COLUMN_COUNT} biometric columns mapped.`;
}

export {
  buildHeaderColumnMap,
  countMappedHeaders,
  shouldUseHeaderMapping,
};
