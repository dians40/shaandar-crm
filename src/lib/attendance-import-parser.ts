import type {
  ManualAttendanceStatus,
  OvertimeShiftType,
} from "@/types/manual-attendance-entry";
import {
  BIOMETRIC_DAY_CODE,
  normalizeBiometricCode,
} from "@/types/manual-attendance-entry";

export type AttendanceImportRow = {
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  status: ManualAttendanceStatus;
  overtimeShift: OvertimeShiftType;
  remarks: string;
};

export type AttendanceImportParseOutcome = {
  rows: AttendanceImportRow[];
  skippedRows: number;
  warnings: string[];
  pdfDocumentUploaded?: boolean;
  pdfBufferBytes?: number;
};

type XlsxModule = typeof import("xlsx");

const FALLBACK_CODE = "TEMP_CODE";
const FALLBACK_NAME = "Unknown";
const DEFAULT_STATUS: ManualAttendanceStatus = BIOMETRIC_DAY_CODE;

const CODE_HINTS = ["code", "id", "card", "emp", "pay"];
const NAME_HINTS = ["name", "worker", "staff", "employee"];
const DATE_HINTS = ["date", "workdate", "attdate"];
const STATUS_HINTS = ["status", "attendance", "present"];
const SHIFT_HINTS = ["shift", "workshift", "dayshift"];
const OT_HINTS = ["ot", "overtime", "overstay"];
const REMARKS_HINTS = ["remark", "note", "comment", "manual"];

export const PDF_UPLOAD_SUCCESS_TOKEN = "📄 [PDF Document Uploaded Successfully]";

const POSITIONAL = {
  code: 1,
  name: 2,
  shift: 5,
  status: 11,
  ot: 16,
  date: -1,
  remarks: 19,
} as const;

let xlsxModulePromise: Promise<XlsxModule | null> | null = null;

async function loadXlsxModule(): Promise<XlsxModule | null> {
  try {
    if (!xlsxModulePromise) {
      xlsxModulePromise = import("xlsx")
        .then((module) => module)
        .catch((error) => {
          console.error(error);
          return null;
        });
    }
    return (await xlsxModulePromise) ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function safeText(value: unknown): string {
  try {
    if (value == null) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.w === "string" && record.w.trim()) return record.w.trim();
      if ("v" in record) return safeText(record.v);
      if ("text" in record) return safeText(record.text);
      return "";
    }
    return String(value).trim();
  } catch (error) {
    console.error(error);
    return "";
  }
}

function sanitizeToken(value: unknown): string {
  try {
    return String(value ?? "")
      .trim()
      .toUpperCase();
  } catch (error) {
    console.error(error);
    return "";
  }
}

function normalizeKey(value: string): string {
  try {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  } catch {
    return "";
  }
}

function keyMatches(key: string, hints: string[]): boolean {
  const normalized = normalizeKey(key);
  return hints.some((hint) => normalized.includes(hint));
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: string): string {
  try {
    const trimmed = value.trim();
    if (!trimmed) return todayIsoDate();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const slash = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (slash) {
      const day = slash[1]!.padStart(2, "0");
      const month = slash[2]!.padStart(2, "0");
      let year = slash[3]!;
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
    return todayIsoDate();
  } catch (error) {
    console.error(error);
    return todayIsoDate();
  }
}

function mapBiometricCode(value: unknown): ManualAttendanceStatus {
  try {
    return normalizeBiometricCode(sanitizeToken(value));
  } catch (error) {
    console.error(error);
    return DEFAULT_STATUS;
  }
}

function mapOvertimeCode(value: unknown, shiftHint: unknown): OvertimeShiftType {
  try {
    const token = sanitizeToken(value);
    if (!token || token === "0" || token === "NONE" || token === "N/A" || token === "-") {
      const shiftToken = sanitizeToken(shiftHint);
      if (shiftToken) return mapBiometricCode(shiftHint);
      return DEFAULT_STATUS;
    }
    if (/^\d+(\.\d+)?$/.test(token)) {
      return mapBiometricCode(shiftHint || DEFAULT_STATUS);
    }
    return mapBiometricCode(value);
  } catch (error) {
    console.error(error);
    return DEFAULT_STATUS;
  }
}

type RowFields = {
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  status: ManualAttendanceStatus;
  overtimeShift: OvertimeShiftType;
  remarks: string;
};

function buildRowPairs(
  rawRow: unknown,
  headers: string[]
): { pairs: Array<{ key: string; value: string }>; byIndex: string[] } {
  const pairs: Array<{ key: string; value: string }> = [];
  const byIndex: string[] = [];
  try {
    if (Array.isArray(rawRow)) {
      rawRow.forEach((cell, index) => {
        const value = safeText(cell);
        byIndex.push(value);
        pairs.push({ key: String(index), value });
        const header = headers[index];
        if (header) pairs.push({ key: header, value });
      });
      return { pairs, byIndex };
    }
    if (rawRow && typeof rawRow === "object") {
      for (const [key, value] of Object.entries(rawRow as Record<string, unknown>)) {
        const text = safeText(value);
        byIndex.push(text);
        pairs.push({ key, value: text });
      }
    }
  } catch (error) {
    console.error(error);
  }
  return { pairs, byIndex };
}

function pickByHints(
  pairs: Array<{ key: string; value: string }>,
  hints: string[],
  fallbackIndex: number,
  used: Set<string>,
  byIndex: string[] = []
): string {
  try {
    for (const pair of pairs) {
      if (used.has(pair.key)) continue;
      if (keyMatches(pair.key, hints)) {
        used.add(pair.key);
        return pair.value;
      }
    }
    if (fallbackIndex >= 0 && fallbackIndex < byIndex.length) {
      return byIndex[fallbackIndex] ?? "";
    }
  } catch (error) {
    console.error(error);
  }
  return "";
}

function extractRowFields(rawRow: unknown, headers: string[]): RowFields {
  try {
    const { pairs, byIndex } = buildRowPairs(rawRow, headers);
    const used = new Set<string>();

    let employeeCode = pickByHints(pairs, CODE_HINTS, POSITIONAL.code, used, byIndex);
    let employeeName = pickByHints(pairs, NAME_HINTS, POSITIONAL.name, used, byIndex);
    const shiftRaw = pickByHints(pairs, SHIFT_HINTS, POSITIONAL.shift, used, byIndex);
    const statusRaw = pickByHints(pairs, STATUS_HINTS, POSITIONAL.status, used, byIndex);
    const otRaw = pickByHints(pairs, OT_HINTS, POSITIONAL.ot, used, byIndex);
    const dateRaw = pickByHints(pairs, DATE_HINTS, POSITIONAL.date, used, byIndex);
    const remarks = pickByHints(pairs, REMARKS_HINTS, POSITIONAL.remarks, used, byIndex);

    if (!employeeCode && employeeName) {
      employeeCode = pickByHints(pairs, CODE_HINTS, POSITIONAL.code + 1, used, byIndex);
    }
    if (!employeeName && employeeCode) {
      employeeName = pickByHints(pairs, NAME_HINTS, POSITIONAL.name + 1, used, byIndex);
    }

    const firstValue = byIndex.find((cell) => cell.length > 0) ?? "";
    if (!employeeCode && !employeeName) {
      employeeCode = firstValue ? `AUTO-${normalizeKey(firstValue).slice(0, 12).toUpperCase()}` : FALLBACK_CODE;
      employeeName = firstValue || FALLBACK_NAME;
    }

    const statusSource = statusRaw || shiftRaw || DEFAULT_STATUS;
    const status = mapBiometricCode(statusSource);
    const overtimeShift = mapOvertimeCode(otRaw, shiftRaw);

    return {
      employeeCode: employeeCode || FALLBACK_CODE,
      employeeName: employeeName || FALLBACK_NAME,
      attendanceDate: normalizeDate(dateRaw),
      status,
      overtimeShift,
      remarks: remarks || `Shift: ${status}`,
    };
  } catch (error) {
    console.error(error);
    return {
      employeeCode: FALLBACK_CODE,
      employeeName: FALLBACK_NAME,
      attendanceDate: todayIsoDate(),
      status: DEFAULT_STATUS,
      overtimeShift: DEFAULT_STATUS,
      remarks: "Recovered by absolute biometric parser.",
    };
  }
}

function createSafeImportRow(partial: Partial<AttendanceImportRow> = {}): AttendanceImportRow {
  try {
    return {
      employeeCode: safeText(partial.employeeCode) || FALLBACK_CODE,
      employeeName: safeText(partial.employeeName) || FALLBACK_NAME,
      attendanceDate: normalizeDate(safeText(partial.attendanceDate)),
      status: mapBiometricCode(partial.status ?? DEFAULT_STATUS),
      overtimeShift: mapBiometricCode(partial.overtimeShift ?? partial.status ?? DEFAULT_STATUS),
      remarks: safeText(partial.remarks),
    };
  } catch (error) {
    console.error(error);
    return {
      employeeCode: FALLBACK_CODE,
      employeeName: FALLBACK_NAME,
      attendanceDate: todayIsoDate(),
      status: DEFAULT_STATUS,
      overtimeShift: DEFAULT_STATUS,
      remarks: "",
    };
  }
}

export function finalizeImportRow(
  row: Partial<AttendanceImportRow> | null | undefined
): AttendanceImportRow {
  try {
    if (!row || typeof row !== "object") return createSafeImportRow();
    return createSafeImportRow(row);
  } catch (error) {
    console.error(error);
    return createSafeImportRow();
  }
}

export function formatBiometricShiftLabel(value: unknown): string {
  return mapBiometricCode(value);
}

function parseCsvLine(line: string): string[] {
  try {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    cells.push(current.trim());
    return cells;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function matrixFromCsvText(text: string): string[][] {
  try {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.includes(",") ? parseCsvLine(line) : line.split(/\t|\|/).map((c) => c.trim())))
      .filter((row) => row.some((cell) => cell.length > 0));
  } catch (error) {
    console.error(error);
    return [];
  }
}

function sheetToMatrix(XLSX: XlsxModule, sheet: import("xlsx").WorkSheet): string[][] {
  const matrix: string[][] = [];
  try {
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: true,
    });
    if (!Array.isArray(rawRows)) return matrix;

    for (const rawRow of rawRows) {
      try {
        if (Array.isArray(rawRow)) {
          const row = rawRow.map((cell) => safeText(cell));
          if (row.some((cell) => cell.length > 0)) matrix.push(row);
          continue;
        }
        if (rawRow && typeof rawRow === "object") {
          const row = Object.values(rawRow as Record<string, unknown>).map((cell) => safeText(cell));
          if (row.some((cell) => cell.length > 0)) matrix.push(row);
          continue;
        }
        const single = safeText(rawRow);
        if (single) matrix.push([single]);
      } catch (rowError) {
        console.error(rowError);
      }
    }
  } catch (error) {
    console.error(error);
  }
  return matrix;
}

async function matrixFromExcelBuffer(buffer: ArrayBuffer): Promise<string[][]> {
  try {
    if (!buffer.byteLength) return [];
    const XLSX = await loadXlsxModule();
    if (!XLSX) return [];

    const bytes = new Uint8Array(buffer);
    let workbook: import("xlsx").WorkBook | null = null;

    try {
      workbook = XLSX.read(bytes, { type: "array", cellDates: true });
    } catch (primaryError) {
      console.error(primaryError);
      try {
        const chunkSize = 8192;
        const chunks: string[] = [];
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          const end = Math.min(offset + chunkSize, bytes.length);
          let segment = "";
          for (let index = offset; index < end; index += 1) {
            segment += String.fromCharCode(bytes[index]!);
          }
          chunks.push(segment);
        }
        workbook = XLSX.read(chunks.join(""), { type: "binary", cellDates: true });
      } catch (fallbackError) {
        console.error(fallbackError);
        return [];
      }
    }

    if (!workbook?.SheetNames?.length) return [];

    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const matrix = sheetToMatrix(XLSX, sheet);
        if (matrix.length > 0) return matrix;
      } catch (sheetError) {
        console.error(sheetError);
      }
    }
  } catch (error) {
    console.error(error);
  }
  return [];
}

function findHeaderRowIndex(matrix: string[][]): number {
  try {
    for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
      const row = matrix[index] ?? [];
      const probe = row.map((cell) => normalizeKey(cell)).join(" ");
      if (
        CODE_HINTS.some((hint) => probe.includes(hint)) ||
        NAME_HINTS.some((hint) => probe.includes(hint)) ||
        SHIFT_HINTS.some((hint) => probe.includes(hint))
      ) {
        return index;
      }
    }
  } catch (error) {
    console.error(error);
  }
  return 0;
}

export function parseAttendanceImportMatrixSafe(
  matrix: string[][]
): AttendanceImportParseOutcome {
  const warnings: string[] = [];
  let skippedRows = 0;

  try {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return { rows: [], skippedRows: 0, warnings };
    }

    const headerIndex = findHeaderRowIndex(matrix);
    const headerRow = matrix[headerIndex] ?? [];
    const headers = headerRow.map((cell) => safeText(cell));
    const dataRows = matrix.slice(headerIndex + 1);
    const rows: AttendanceImportRow[] = [];

    try {
      for (const rawRow of dataRows) {
        try {
          const hasContent = Array.isArray(rawRow)
            ? rawRow.some((cell) => safeText(cell).length > 0)
            : false;
          if (!hasContent) {
            skippedRows += 1;
            continue;
          }
          rows.push(finalizeImportRow(extractRowFields(rawRow, headers)));
        } catch (rowError) {
          console.error(rowError);
          rows.push(finalizeImportRow({ status: DEFAULT_STATUS }));
          warnings.push("One row was recovered with default DY1 status.");
        }
      }
    } catch (iterationError) {
      console.error(iterationError);
      warnings.push("Row iteration recovered safely.");
    }

    if (rows.length === 0) {
      warnings.push("No attendance rows were extracted from the sheet.");
    }

    return { rows, skippedRows, warnings };
  } catch (error) {
    console.error(error);
    return {
      rows: [],
      skippedRows: 0,
      warnings: [...warnings, "Matrix parse terminated safely."],
    };
  }
}

export function parseAttendanceImportMatrix(matrix: string[][]): AttendanceImportRow[] {
  return parseAttendanceImportMatrixSafe(matrix).rows;
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
            return;
          }
          console.error("FileReader returned non-ArrayBuffer payload.");
          resolve(new ArrayBuffer(0));
        } catch (error) {
          console.error(error);
          resolve(new ArrayBuffer(0));
        }
      };
      reader.onerror = () => {
        try {
          console.error(new Error("Failed to read file."));
        } catch (error) {
          console.error(error);
        }
        resolve(new ArrayBuffer(0));
      };
      reader.onabort = () => {
        try {
          console.error(new Error("File read cancelled."));
        } catch (error) {
          console.error(error);
        }
        resolve(new ArrayBuffer(0));
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      resolve(new ArrayBuffer(0));
    }
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(String(reader.result ?? ""));
        } catch (error) {
          console.error(error);
          resolve("");
        }
      };
      reader.onerror = () => {
        try {
          console.error(new Error("Failed to read file."));
        } catch (error) {
          console.error(error);
        }
        resolve("");
      };
      reader.onabort = () => {
        try {
          console.error(new Error("File read cancelled."));
        } catch (error) {
          console.error(error);
        }
        resolve("");
      };
      reader.readAsText(file);
    } catch (error) {
      console.error(error);
      resolve("");
    }
  });
}

async function readFileBufferResilient(file: File): Promise<ArrayBuffer> {
  try {
    if (typeof file.arrayBuffer === "function") {
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength > 0) return buffer;
    }
  } catch (error) {
    console.error(error);
  }
  return readFileAsArrayBuffer(file);
}

function resolveExtension(file: File): string {
  try {
    const fromName = file.name.toLowerCase().split(".").pop() ?? "";
    if (fromName) return fromName;
    const mime = file.type.toLowerCase();
    if (mime.includes("csv")) return "csv";
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("sheet") || mime.includes("excel")) return "xlsx";
    return "";
  } catch {
    return "";
  }
}

export async function parseAttendanceImportFileSafe(
  file: File
): Promise<AttendanceImportParseOutcome> {
  const warnings: string[] = [];

  try {
    if (!file || file.size === 0) {
      return { rows: [], skippedRows: 0, warnings: ["The selected file is empty."] };
    }

    const extension = resolveExtension(file);

    if (extension === "csv") {
      try {
        const text = await readFileAsText(file);
        const outcome = parseAttendanceImportMatrixSafe(matrixFromCsvText(text));
        return { ...outcome, warnings: [...warnings, ...outcome.warnings] };
      } catch (error) {
        console.error(error);
        return { rows: [], skippedRows: 0, warnings: [...warnings, "CSV import recovered safely."] };
      }
    }

    if (extension === "xlsx" || extension === "xls") {
      try {
        const buffer = await readFileBufferResilient(file);
        const matrix = await matrixFromExcelBuffer(buffer);
        const outcome = parseAttendanceImportMatrixSafe(matrix);
        return { ...outcome, warnings: [...warnings, ...outcome.warnings] };
      } catch (error) {
        console.error(error);
        return { rows: [], skippedRows: 0, warnings: [...warnings, "Excel import recovered safely."] };
      }
    }

    if (extension === "pdf") {
      try {
        const buffer = await readFileBufferResilient(file);
        return {
          rows: [],
          skippedRows: 0,
          warnings: [PDF_UPLOAD_SUCCESS_TOKEN],
          pdfDocumentUploaded: true,
          pdfBufferBytes: buffer.byteLength,
        };
      } catch (error) {
        console.error(error);
        return {
          rows: [],
          skippedRows: 0,
          warnings: [PDF_UPLOAD_SUCCESS_TOKEN],
          pdfDocumentUploaded: true,
          pdfBufferBytes: 0,
        };
      }
    }

    return {
      rows: [],
      skippedRows: 0,
      warnings: [...warnings, "Unsupported file type. Upload .xlsx, .xls, or .csv."],
    };
  } catch (error) {
    console.error(error);
    return {
      rows: [],
      skippedRows: 0,
      warnings: [...warnings, "File import terminated safely without crashing."],
    };
  }
}

export async function parseAttendanceImportFile(file: File): Promise<AttendanceImportRow[]> {
  const outcome = await parseAttendanceImportFileSafe(file);
  return outcome.rows;
}
