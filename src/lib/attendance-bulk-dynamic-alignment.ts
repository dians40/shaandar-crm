import {
  bulkRecordFromHeaderMap,
  buildHeaderColumnMap,
  countMappedHeaders,
  fuzzyHeaderToken,
  normalizeHeaderKey,
  shouldUseHeaderMapping,
  type BiometricColumnKey,
} from "@/lib/attendance-bulk-header-normalizer";
import {
  bulkRecordFromCells,
  normalizeAttendanceDateIso,
  normalizeBiometric23ColumnRecord,
  type Biometric23ColumnRecord,
} from "@/types/attendance-bulk-import-row";

export const FLEXIBLE_COLUMN_MIN = 22;
export const FLEXIBLE_COLUMN_MAX = 24;
export const EXCEL_BIOMETRIC_COLUMN_COUNT = 22;
export const GRID_BIOMETRIC_COLUMN_COUNT = 23;

export type BiometricColumnStructure = "excel-22" | "grid-23" | "flexible";

function safeCell(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

/** Strip trailing empty/hash columns — accepts workbooks with 22–24 physical columns. */
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

/** True when row length (after trim) is within flexible 22–24 range — never blocks import. */
export function isFlexibleColumnCount(length: number): boolean {
  return length >= FLEXIBLE_COLUMN_MIN && length <= FLEXIBLE_COLUMN_MAX;
}

export function looksLikeDateToken(value: unknown): boolean {
  try {
    const token = safeCell(value);
    if (!token) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return true;
    return /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(token);
  } catch {
    return false;
  }
}

/** Apply numeric insulation — empty overstay/overtime/manual default to "0". */
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

/** Positional flexible mapper — accepts 22, 23, or 24 columns without validation errors. */
export function flexibleBulkRecordFromCells(
  cells: unknown,
  defaultDate?: string
): Biometric23ColumnRecord {
  return bulkRecordFromCells(cells, defaultDate);
}

/** Case-insensitive header auto-mapper — extracts explicit date when present. */
export function autoMapHeadersToRecord(
  rawRow: unknown,
  headers: string[],
  reportDate?: string
): Biometric23ColumnRecord {
  try {
    const normalizedHeaders = headers.map((header) =>
      normalizeHeaderKey(header).trim().toLowerCase()
    );
    const columnMap = buildHeaderColumnMap(normalizedHeaders);
    const fallbackDate = normalizeAttendanceDateIso(reportDate);
    const record = bulkRecordFromHeaderMap(rawRow, columnMap, fallbackDate);

    if (columnMap.date != null) {
      record.date = normalizeAttendanceDateIso(record.date, fallbackDate);
    } else {
      record.date = normalizeAttendanceDateIso(record.date, fallbackDate);
    }

    return applyBulkNumericInsulation(
      normalizeBiometric23ColumnRecord(record, { defaultDate: fallbackDate })
    );
  } catch (error) {
    console.error("[flexible-alignment] autoMapHeadersToRecord failed:", error);
    return applyBulkNumericInsulation(
      normalizeBiometric23ColumnRecord(null, {
        defaultDate: normalizeAttendanceDateIso(reportDate),
      })
    );
  }
}

export function detectBiometricColumnStructure(
  columnMap: Partial<Record<BiometricColumnKey, number>>,
  sampleRow?: unknown[]
): BiometricColumnStructure {
  try {
    if (columnMap.date != null) return "grid-23";
    const trimmed = Array.isArray(sampleRow) ? trimTrailingEmptyCells(sampleRow) : [];
    if (trimmed.length >= 23 && looksLikeDateToken(trimmed[7])) return "grid-23";
    if (isFlexibleColumnCount(trimmed.length)) return "excel-22";
    return "flexible";
  } catch {
    return "flexible";
  }
}

/** Primary flexible engine — header map first, then positional 22–24 fallback. Never throws. */
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
    const mappedCount = countMappedHeaders(options.columnMap);
    const useHeaders =
      options.useHeaderMapping !== false &&
      (mappedCount >= 3 || (Array.isArray(options.headers) && options.headers.length >= 4));

    if (useHeaders) {
      const fromHeaders = bulkRecordFromHeaderMap(
        rawRow,
        options.columnMap,
        fallbackDate
      );
      if (options.columnMap.date != null) {
        fromHeaders.date = normalizeAttendanceDateIso(fromHeaders.date, fallbackDate);
      } else {
        fromHeaders.date = normalizeAttendanceDateIso(fromHeaders.date, fallbackDate);
      }
      return applyBulkNumericInsulation(
        normalizeBiometric23ColumnRecord(fromHeaders, { defaultDate: fallbackDate })
      );
    }

    return flexibleBulkRecordFromCells(rawRow, fallbackDate);
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

/** Informational alignment summary — never blocks processing or implies failure. */
export function formatFlexibleAlignmentInfo(
  columnMap: Partial<Record<BiometricColumnKey, number>>,
  reportDate?: string,
  sampleRow?: unknown[]
): string {
  try {
    const mapped = countMappedHeaders(columnMap);
    const resolvedDate = normalizeAttendanceDateIso(reportDate);
    const trimmed = Array.isArray(sampleRow) ? trimTrailingEmptyCells(sampleRow) : [];
    const colCount = trimmed.length;
    const hasDateHeader = columnMap.date != null;

    if (hasDateHeader) {
      return `Flexible alignment ready: ${mapped} columns matched including explicit Date from sheet.`;
    }

    if (isFlexibleColumnCount(colCount)) {
      return `Flexible alignment ready: ${mapped} headers matched across ${colCount} columns; report date ${resolvedDate} applied for storage.`;
    }

    return `Flexible alignment ready: ${mapped} columns matched; report date ${resolvedDate} applied.`;
  } catch {
    return "Flexible alignment ready: import proceeding with automatic column mapping.";
  }
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

export {
  buildHeaderColumnMap,
  countMappedHeaders,
  shouldUseHeaderMapping,
};
