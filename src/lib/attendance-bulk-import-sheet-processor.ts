import {
  bulkRecordFromCells,
  bulkRecordHasContent,
  normalizeBiometric22ColumnRecord,
  processBulkRowUpdate,
  type Biometric22ColumnRecord,
} from "@/types/attendance-bulk-import-row";

export type BulkImportSheetRow = Biometric22ColumnRecord & { id: string };

export function rowIdFromIndex(index: number | null | undefined): string {
  try {
    if (index == null || !Number.isFinite(index) || index < 0) return "";
    return `bulk-row-${index}`;
  } catch (error) {
    console.error(error);
    return "";
  }
}

/** Normalize layout sheet matrix rows into stable 22-column records. */
export function processLayoutSheetMatrix(matrix: string[][]): Biometric22ColumnRecord[] {
  try {
    if (!Array.isArray(matrix) || matrix.length === 0) return [];

    const records: Biometric22ColumnRecord[] = [];
    for (const rawRow of matrix) {
      try {
        const record = bulkRecordFromCells(rawRow);
        if (!bulkRecordHasContent(record)) continue;
        records.push(normalizeBiometric22ColumnRecord(record));
      } catch (rowError) {
        console.error(rowError);
        records.push(normalizeBiometric22ColumnRecord(null));
      }
    }
    return records;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function processLayoutSheetRowUpdate(
  id: string | null | undefined,
  oldRow: Biometric22ColumnRecord | null | undefined,
  newRow: Biometric22ColumnRecord | null | undefined
): Biometric22ColumnRecord {
  return processBulkRowUpdate(id, oldRow, newRow);
}

export function attachBulkRowIds(rows: Biometric22ColumnRecord[]): BulkImportSheetRow[] {
  try {
    if (!Array.isArray(rows)) return [];
    return rows.map((row, index) => ({
      ...normalizeBiometric22ColumnRecord(row),
      id: rowIdFromIndex(index),
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}
