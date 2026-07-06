import type {
  ManualAttendanceStatus,
  OvertimeShiftType,
} from "@/types/manual-attendance-entry";
import {
  BIOMETRIC_DAY_CODE,
  BIOMETRIC_NIGHT_CODE,
  normalizeBiometricCode,
} from "@/types/manual-attendance-entry";

export type AttendanceImportRow = {
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  status: ManualAttendanceStatus;
  overtimeShift: OvertimeShiftType | "";
  remarks: string;
};

export type AttendanceImportParseOutcome = {
  rows: AttendanceImportRow[];
  skippedRows: number;
  warnings: string[];
};

type XlsxModule = typeof import("xlsx");

let xlsxModulePromise: Promise<XlsxModule> | null = null;

async function loadXlsxModule(): Promise<XlsxModule> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx").catch((error) => {
      xlsxModulePromise = null;
      throw error;
    });
  }
  return xlsxModulePromise;
}

const VALID_STATUSES = new Set<ManualAttendanceStatus>([BIOMETRIC_DAY_CODE, BIOMETRIC_NIGHT_CODE]);

const CODE_HEADERS = new Set([
  "employeecode",
  "employeeid",
  "staffcode",
  "code",
  "empid",
  "empcode",
  "workerid",
  "paycode",
  "cardnumber",
  "paycodecarnumber",
]);

const NAME_HEADERS = new Set([
  "employeename",
  "staffname",
  "name",
  "employee",
  "fullname",
  "worker",
  "staff",
]);

const DATE_HEADERS = new Set(["attendancedate", "date", "workdate", "attdate"]);

const STATUS_HEADERS = new Set([
  "status",
  "attendancestatus",
  "attendance",
  "attstatus",
  "presentstatus",
  "present",
]);

const SHIFT_HEADERS = new Set(["workshift", "shift", "dayshift", "shiftname"]);

const OT_HEADERS = new Set([
  "overtimehours",
  "overtime",
  "othours",
  "ot",
  "overtimehour",
]);

const OT_SHIFT_HEADERS = new Set(["overtimeshift", "otshift", "overtimeband"]);

const REMARKS_HEADERS = new Set(["remarks", "notes", "shiftinfo", "comment"]);

const FUZZY_CODE_PATTERNS = [/pay\s*code/i, /card\s*number/i, /cardnumber/i, /code/i, /\bid\b/i, /emp/i];
const FUZZY_NAME_PATTERNS = [/employee\s*name/i, /emp\s*name/i, /name/i, /worker/i, /staff/i];
const FUZZY_DATE_PATTERNS = [/date/i, /workdate/i, /attdate/i];
const FUZZY_STATUS_PATTERNS = [/^status$/i, /attendance/i, /present/i];
const FUZZY_SHIFT_PATTERNS = [/workshift/i, /\bshift\b/i, /dayshift/i];
const FUZZY_OT_SHIFT_PATTERNS = [/overtime.*shift/i, /ot.*shift/i, /overtimeshift/i, /overtime/i, /\bot\b/i];
const FUZZY_OT_PATTERNS = [/^ot$/i, /overtime/i, /\bot\b/i, /othours/i, /overtimeamount/i];
const FUZZY_REMARKS_PATTERNS = [/remarks/i, /notes/i, /comment/i, /^manual$/i];

/** Standard industrial biometric export column order (20 core + extended). */
const BIOMETRIC_POSITIONAL_LAYOUT = {
  serialIndex: 0,
  codeIndex: 1,
  nameIndex: 2,
  departmentIndex: 3,
  designationIndex: 4,
  shiftIndex: 5,
  startInIndex: 6,
  lunchOutIndex: 7,
  lunchInIndex: 8,
  outIndex: 9,
  hoursWorkedIndex: 10,
  statusIndex: 11,
  earlyArrivalIndex: 12,
  shiftLateIndex: 13,
  earlyAccessIndex: 14,
  lunchIndex: 15,
  otIndex: 16,
  overtimeAmountIndex: 17,
  overStayIndex: 18,
  manualIndex: 19,
} as const;

const BIOMETRIC_MIN_COLUMNS = 15;
const BIOMETRIC_MAX_WIDTH = 32;

const FALLBACK_EMPLOYEE_CODE = "TEMP_CODE";
const FALLBACK_EMPLOYEE_NAME = "Unknown";
const DEFAULT_IMPORT_STATUS: ManualAttendanceStatus = BIOMETRIC_DAY_CODE;

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value).trim();
  } catch {
    return "";
  }
}

function resolveMatrixCell(matrix: string[], index: number | undefined): string {
  try {
    if (index == null || index < 0 || index >= matrix.length) return "";
    return safeString(matrix[index]);
  } catch {
    return "";
  }
}

/** Ultra-safe 25+ column coercion — never throws on null, sparse, or object rows. */
function buildBiometricSanitizationMatrix(rawCells: unknown): string[] {
  try {
    const matrix = Array.from({ length: BIOMETRIC_MAX_WIDTH }, () => "");

    if (Array.isArray(rawCells)) {
      for (let index = 0; index < rawCells.length && index < BIOMETRIC_MAX_WIDTH; index += 1) {
        try {
          matrix[index] = safeString(rawCells[index]);
        } catch {
          matrix[index] = "";
        }
      }
      return matrix;
    }

    if (rawCells && typeof rawCells === "object") {
      const record = rawCells as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        try {
          const index = Number(key);
          if (Number.isInteger(index) && index >= 0 && index < BIOMETRIC_MAX_WIDTH) {
            matrix[index] = safeString(value);
          }
        } catch {
          continue;
        }
      }
    }

    return matrix;
  } catch {
    return Array.from({ length: BIOMETRIC_MAX_WIDTH }, () => "");
  }
}

function shouldUseBiometricLayout(
  rawHeaderCells: string[],
  normalizedHeaderCells: string[],
  sampleRows: string[][]
): boolean {
  try {
    if (detectBiometricLayout(rawHeaderCells, normalizedHeaderCells)) return true;

    let maxWidth = Math.max(rawHeaderCells.length, normalizedHeaderCells.length);
    for (const row of sampleRows.slice(0, 12)) {
      if (Array.isArray(row)) maxWidth = Math.max(maxWidth, row.length);
    }

    return maxWidth >= BIOMETRIC_MIN_COLUMNS;
  } catch {
    return false;
  }
}

function findBiometricShiftColumnIndex(
  rawHeaders: string[],
  normalizedHeaders: string[],
  excludeIndices: number[] = []
): number {
  for (let index = 0; index < rawHeaders.length; index += 1) {
    if (excludeIndices.includes(index)) continue;
    const probe = `${safeString(rawHeaders[index])} ${normalizedHeaders[index] ?? ""}`;
    if (/shiftlate/i.test(probe)) continue;
    if (/\bshift\b/i.test(probe) && !/overtime/i.test(probe)) {
      return index;
    }
  }
  return -1;
}

function detectBiometricLayout(
  rawHeaderCells: string[],
  normalizedHeaderCells: string[]
): boolean {
  try {
    const probe = rawHeaderCells
      .map((cell, index) => `${safeString(cell)} ${normalizedHeaderCells[index] ?? ""}`)
      .join(" ");

    const hasPayOrCard = /pay\s*code|card\s*number|cardnumber|paycode/i.test(probe);
    const hasEmployeeName = /employee\s*name|emp\s*name|\bname\b/i.test(probe);
    const hasStatus = /\bstatus\b/i.test(probe);
    const hasShift = /\bshift\b/i.test(probe);
    const hasPunchColumns =
      /start\s*in|lunch\s*out|lunch\s*in|\bout\b|hours\s*worked/i.test(probe);

    const matchedSignals = [hasPayOrCard, hasEmployeeName, hasStatus, hasShift, hasPunchColumns].filter(
      Boolean
    ).length;

    return matchedSignals >= 3 || (hasPayOrCard && hasStatus) || normalizedHeaderCells.length >= BIOMETRIC_MIN_COLUMNS;
  } catch {
    return false;
  }
}

function hasOvertimeSignal(otValue: string, overtimeAmount: string, overStay = ""): boolean {
  try {
    const ot = safeString(otValue);
    const amount = safeString(overtimeAmount);
    const stay = safeString(overStay);

    if (!ot && !amount && !stay) return false;

    const otNum = Number(ot.replace(/[^\d.-]/g, ""));
    const amountNum = Number(amount.replace(/[^\d.-]/g, ""));
    const stayNum = Number(stay.replace(/[^\d.-]/g, ""));

    if (Number.isFinite(otNum) && otNum > 0) return true;
    if (Number.isFinite(amountNum) && amountNum > 0) return true;
    if (Number.isFinite(stayNum) && stayNum > 0) return true;

    if (ot && !/^(0|0\.0+|no|nil|none|-)$/i.test(ot)) return true;
    if (amount && !/^(0|0\.0+|no|nil|none|-)$/i.test(amount)) return true;
    if (stay && !/^(0|0\.0+|no|nil|none|-)$/i.test(stay)) return true;

    return false;
  } catch {
    return false;
  }
}

function parseBiometricOvertimeShift(
  otValue: string,
  overtimeAmount: string,
  shiftHint: string,
  overStay = ""
): OvertimeShiftType | "" {
  try {
    if (!hasOvertimeSignal(otValue, overtimeAmount, overStay)) return "";

    const otToken = sanitizeBiometricShiftToken(`${otValue} ${overtimeAmount} ${overStay}`);
    if (otToken.includes(BIOMETRIC_NIGHT_CODE) || otToken.includes(BIOMETRIC_DAY_CODE)) {
      return normalizeBiometricCode(otToken);
    }

    return normalizeBiometricCode(shiftHint);
  } catch {
    return BIOMETRIC_DAY_CODE;
  }
}

function parseBiometricStatus(
  statusRaw: string,
  shiftRaw: string,
  _hoursWorked = ""
): ManualAttendanceStatus {
  try {
    const statusToken = sanitizeBiometricShiftToken(statusRaw);
    const shiftToken = sanitizeBiometricShiftToken(shiftRaw);

    if (statusToken.includes(BIOMETRIC_NIGHT_CODE) || statusToken.includes(BIOMETRIC_DAY_CODE)) {
      return normalizeBiometricCode(statusRaw);
    }
    if (shiftToken) {
      return normalizeBiometricCode(shiftRaw);
    }

    return DEFAULT_IMPORT_STATUS;
  } catch {
    return DEFAULT_IMPORT_STATUS;
  }
}

function processBiometricImportRow(
  cells: unknown,
  columnMap: ImportColumnMap
): Partial<AttendanceImportRow> {
  try {
    const matrix = buildBiometricSanitizationMatrix(cells);

    let employeeCode = resolveMatrixCell(matrix, columnMap.codeIndex);
    let employeeName =
      resolveMatrixCell(matrix, columnMap.nameIndex) ||
      resolveMatrixCell(matrix, (columnMap.codeIndex ?? -1) + 1);

    if (!employeeCode && !employeeName) {
      const seedIndex = matrix.findIndex((cell) => cell.length > 0);
      const seed = seedIndex >= 0 ? matrix[seedIndex]! : "";
      employeeCode = seed ? deriveAutoEmployeeCode(seed) : FALLBACK_EMPLOYEE_CODE;
      employeeName = seed || FALLBACK_EMPLOYEE_NAME;
    }

    const statusRaw = resolveMatrixCell(matrix, columnMap.statusIndex);
    const shiftToken = sanitizeBiometricShiftToken(resolveMatrixCell(matrix, columnMap.shiftIndex));
    const hoursWorked = resolveMatrixCell(matrix, columnMap.hoursWorkedIndex);
    const otValue = sanitizeBiometricShiftToken(resolveMatrixCell(matrix, columnMap.otIndex));
    const otAmount = sanitizeBiometricShiftToken(
      resolveMatrixCell(matrix, columnMap.overtimeAmountIndex)
    );
    const overStay = sanitizeBiometricShiftToken(resolveMatrixCell(matrix, columnMap.overStayIndex));

    const status = parseBiometricStatus(statusRaw, shiftToken, hoursWorked);
    const overtimeShift = parseBiometricOvertimeShift(otValue, otAmount, shiftToken, overStay);

    const remarks = [
      shiftToken ? `Shift: ${normalizeBiometricCode(shiftToken)}` : `Shift: ${BIOMETRIC_DAY_CODE}`,
      buildBiometricRemarks(matrix, columnMap),
      resolveMatrixCell(matrix, columnMap.remarksIndex),
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      employeeCode: employeeCode || FALLBACK_EMPLOYEE_CODE,
      employeeName: employeeName || FALLBACK_EMPLOYEE_NAME,
      attendanceDate: normalizeAttendanceDate(resolveMatrixCell(matrix, columnMap.dateIndex)),
      status,
      overtimeShift,
      remarks,
    };
  } catch {
    return {
      employeeCode: FALLBACK_EMPLOYEE_CODE,
      employeeName: FALLBACK_EMPLOYEE_NAME,
      status: DEFAULT_IMPORT_STATUS,
      remarks: "Recovered by biometric sanitization matrix.",
    };
  }
}

function processRowThroughSanitizationMatrix(
  cells: unknown,
  columnMap: ImportColumnMap
): AttendanceImportRow {
  try {
    if (columnMap.isBiometricLayout) {
      return finalizeImportRow(processBiometricImportRow(cells, columnMap));
    }

    const parsed = parseGenericImportRow(cells, columnMap);
    return finalizeImportRow(parsed ?? {});
  } catch {
    return finalizeImportRow({
      employeeCode: FALLBACK_EMPLOYEE_CODE,
      employeeName: FALLBACK_EMPLOYEE_NAME,
      status: DEFAULT_IMPORT_STATUS,
      remarks: "Recovered by sanitization matrix.",
    });
  }
}

function buildBiometricRemarks(rowCells: unknown, columnMap: ImportColumnMap): string {
  try {
    const parts: string[] = [];
    const append = (index: number | undefined, label: string) => {
      if (index == null || index < 0) return;
      const value = safeCell(rowCells, index);
      if (value) parts.push(`${label}: ${value}`);
    };

    append(columnMap.serialIndex, "Serial");
    append(columnMap.departmentIndex, "Department");
    append(columnMap.designationIndex, "Designation");
    append(columnMap.startInIndex, "Start In");
    append(columnMap.lunchOutIndex, "Lunch Out");
    append(columnMap.lunchInIndex, "Lunch In");
    append(columnMap.outIndex, "Out");
    append(columnMap.hoursWorkedIndex, "Hours Worked");
    append(columnMap.earlyArrivalIndex, "Early Arrival");
    append(columnMap.shiftLateIndex, "Shift Late");
    append(columnMap.earlyAccessIndex, "Early Access");
    append(columnMap.lunchIndex, "Lunch");
    append(columnMap.overStayIndex, "Over Stay");
    append(columnMap.manualIndex, "Manual");

    return parts.join(" · ");
  } catch {
    return "";
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeHeader(value: string): string {
  try {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  } catch {
    return "";
  }
}

function formatExcelSerialDate(serial: number, xlsx: XlsxModule): string {
  try {
    const parsed = xlsx.SSF?.parse_date_code?.(serial);
    if (!parsed) return String(serial);
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  } catch {
    return String(serial);
  }
}

function cellToString(cell: unknown, xlsx?: XlsxModule, depth = 0): string {
  try {
    if (depth > 6) return "";
    if (cell == null || cell === "") return "";

    if (cell instanceof Date) {
      if (Number.isNaN(cell.getTime())) return "";
      return cell.toISOString().slice(0, 10);
    }

    if (typeof cell === "boolean") {
      return cell ? "true" : "false";
    }

    if (typeof cell === "number" && Number.isFinite(cell)) {
      if (xlsx && cell > 30000 && cell < 70000) {
        return formatExcelSerialDate(cell, xlsx);
      }
      return String(cell);
    }

    if (typeof cell === "bigint") {
      return String(cell);
    }

    if (Array.isArray(cell)) {
      return cell
        .map((entry) => cellToString(entry, xlsx, depth + 1))
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    if (typeof cell === "object") {
      const record = cell as Record<string, unknown>;

      if (typeof record.w === "string" && record.w.trim()) {
        return record.w.trim();
      }
      if (typeof record.h === "string" && record.h.trim()) {
        return record.h.trim();
      }
      if (typeof record.f === "string" && record.f.trim()) {
        return record.f.trim();
      }
      if ("v" in record) {
        return cellToString(record.v, xlsx, depth + 1);
      }
      if ("text" in record) {
        return cellToString(record.text, xlsx, depth + 1);
      }
      if ("result" in record) {
        return cellToString(record.result, xlsx, depth + 1);
      }
      if ("richText" in record && Array.isArray(record.richText)) {
        return (record.richText as Array<{ text?: unknown }>)
          .map((part) => cellToString(part?.text, xlsx, depth + 1))
          .join("")
          .trim();
      }

      for (const key of ["formatted", "label", "value", "display", "content"] as const) {
        if (key in record) {
          const nested = cellToString(record[key], xlsx, depth + 1);
          if (nested) return nested;
        }
      }

      return "";
    }

    return safeString(cell);
  } catch {
    return "";
  }
}

/** Safe uppercase intercept for biometric Shift / OT column tokens (DY1 / G11). */
function sanitizeBiometricShiftToken(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim().toUpperCase();
  } catch {
    return "";
  }
}

export function formatBiometricShiftLabel(value: unknown): string {
  return normalizeBiometricCode(value);
}

function parseCsvLine(line: string): string[] {
  try {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
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
  } catch {
    return [];
  }
}

function parseStatus(value: string, shiftHint = ""): ManualAttendanceStatus {
  try {
    const combined = `${sanitizeBiometricShiftToken(value)} ${sanitizeBiometricShiftToken(shiftHint)}`.trim();
    if (!combined) return DEFAULT_IMPORT_STATUS;
    if (VALID_STATUSES.has(value.trim() as ManualAttendanceStatus)) {
      return value.trim() as ManualAttendanceStatus;
    }
    return normalizeBiometricCode(combined);
  } catch {
    return DEFAULT_IMPORT_STATUS;
  }
}

function parseOvertimeShift(value: string): OvertimeShiftType | "" {
  try {
    const token = sanitizeBiometricShiftToken(value);
    if (!token || token === "NONE" || token === "N/A" || token === "-") return "";
    if (/^\d+(\.\d+)?$/.test(token)) return "";
    return normalizeBiometricCode(token);
  } catch {
    return "";
  }
}

function createSafeImportRow(partial: Partial<AttendanceImportRow> = {}): AttendanceImportRow {
  const employeeCode = safeString(partial.employeeCode) || FALLBACK_EMPLOYEE_CODE;
  const employeeName = safeString(partial.employeeName) || FALLBACK_EMPLOYEE_NAME;
  const statusRaw = safeString(partial.status);
  const status = VALID_STATUSES.has(statusRaw as ManualAttendanceStatus)
    ? (statusRaw as ManualAttendanceStatus)
    : parseStatus(statusRaw);

  let overtimeShift: OvertimeShiftType | "" = "";
  try {
    overtimeShift = parseOvertimeShift(safeString(partial.overtimeShift));
  } catch {
    overtimeShift = "";
  }

  const appliedDefaults: string[] = [];
  if (!safeString(partial.employeeCode)) appliedDefaults.push(`code=${FALLBACK_EMPLOYEE_CODE}`);
  if (!safeString(partial.employeeName)) appliedDefaults.push(`name=${FALLBACK_EMPLOYEE_NAME}`);
  if (!statusRaw) appliedDefaults.push(`status=${BIOMETRIC_DAY_CODE}`);

  const remarks = [
    safeString(partial.remarks),
    appliedDefaults.length > 0 ? `Defaults applied: ${appliedDefaults.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    employeeCode,
    employeeName,
    attendanceDate: normalizeAttendanceDate(safeString(partial.attendanceDate)),
    status,
    overtimeShift,
    remarks,
  };
}

export function finalizeImportRow(row: Partial<AttendanceImportRow> | null | undefined): AttendanceImportRow {
  try {
    if (!row || typeof row !== "object") {
      return createSafeImportRow();
    }
    return createSafeImportRow(row);
  } catch {
    return createSafeImportRow();
  }
}

function rowHasContent(cells: string[]): boolean {
  try {
    return cells.some((cell) => String(cell ?? "").trim().length > 0);
  } catch {
    return false;
  }
}

function deriveAutoEmployeeCode(seed: string): string {
  const normalized = seed.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return normalized ? `AUTO-${normalized}` : `AUTO-${Date.now().toString().slice(-8)}`;
}

function splitDelimitedLine(line: string): string[] {
  try {
    if (line.includes("\t")) {
      return line.split("\t").map((cell) => cell.trim());
    }
    if (line.includes("|")) {
      return line.split("|").map((cell) => cell.trim());
    }
    if (/\s{2,}/.test(line)) {
      return line.split(/\s{2,}/).map((cell) => cell.trim());
    }
    return line.split(",").map((cell) => cell.trim());
  } catch {
    return [];
  }
}

function sanitizeMatrix(matrix: unknown): string[][] {
  if (!Array.isArray(matrix)) return [];

  const sanitized: string[][] = [];

  for (const rawRow of matrix) {
    try {
      if (!Array.isArray(rawRow)) continue;
      const row: string[] = [];
      for (let index = 0; index < rawRow.length; index += 1) {
        try {
          row.push(cellToString(rawRow[index]));
        } catch {
          row.push("");
        }
      }
      if (row.some((cell) => cell.length > 0)) {
        sanitized.push(row);
      }
    } catch {
      continue;
    }
  }

  return sanitized;
}

function matrixFromCsvText(text: string): string[][] {
  try {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.includes(",") ? parseCsvLine(line) : splitDelimitedLine(line)))
      .filter((row) => row.some((cell) => cell.length > 0));
  } catch {
    return [];
  }
}

function bufferToBinaryString(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
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

    return chunks.join("");
  } catch {
    return "";
  }
}

function readWorkbookFromBuffer(XLSX: XlsxModule, buffer: ArrayBuffer, extension: string) {
  const bytes = new Uint8Array(buffer);
  const attempts: Array<{ type: "array" | "binary"; data: Uint8Array | string }> = [];

  if (extension === "xls") {
    attempts.push({ type: "binary", data: bufferToBinaryString(buffer) });
    attempts.push({ type: "array", data: bytes });
  } else {
    attempts.push({ type: "array", data: bytes });
    attempts.push({ type: "binary", data: bufferToBinaryString(buffer) });
  }

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      return XLSX.read(attempt.data, {
        type: attempt.type,
        cellDates: true,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to read the Excel workbook binary data.");
}

function sheetToMatrix(XLSX: XlsxModule, sheet: import("xlsx").WorkSheet): string[][] {
  try {
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: true,
    });

    if (!Array.isArray(rawRows)) return [];

    const matrix: string[][] = [];

    for (const rawRow of rawRows) {
      try {
        if (Array.isArray(rawRow)) {
          const row: string[] = [];
          for (let index = 0; index < rawRow.length; index += 1) {
            try {
              row.push(cellToString(rawRow[index], XLSX));
            } catch {
              row.push("");
            }
          }
          if (row.some((cell) => cell.length > 0)) {
            matrix.push(row);
          }
          continue;
        }

        const single = cellToString(rawRow, XLSX);
        if (single) {
          matrix.push([single]);
        }
      } catch {
        continue;
      }
    }

    return matrix;
  } catch {
    return [];
  }
}

async function matrixFromExcelBuffer(
  buffer: ArrayBuffer,
  extension: string
): Promise<{ matrix: string[][]; warnings: string[] }> {
  const warnings: string[] = [];

  if (!buffer || buffer.byteLength === 0) {
    warnings.push("The Excel file buffer is empty.");
    return { matrix: [], warnings };
  }

  try {
    const XLSX = await loadXlsxModule();
    let workbook;

    try {
      workbook = readWorkbookFromBuffer(XLSX, buffer, extension);
    } catch {
      warnings.push(
        "Primary Excel decode failed. Attempting alternate binary read strategy."
      );
      try {
        workbook = readWorkbookFromBuffer(XLSX, buffer, extension === "xls" ? "xlsx" : "xls");
      } catch {
        warnings.push("Unable to decode Excel workbook. Rows will be recovered if CSV text is embedded.");
        return { matrix: [], warnings };
      }
    }

    if (!workbook?.SheetNames?.length) {
      warnings.push("The Excel file does not contain any worksheets.");
      return { matrix: [], warnings };
    }

    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const matrix = sheetToMatrix(XLSX, sheet);
        if (matrix.length > 0) {
          return { matrix, warnings };
        }
      } catch {
        continue;
      }
    }

    warnings.push("All Excel worksheets were empty or unreadable.");
    return { matrix: [], warnings };
  } catch {
    warnings.push("Excel parsing encountered an unexpected error.");
    return { matrix: [], warnings };
  }
}

function decodePdfBinary(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
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

    return chunks.join("");
  } catch {
    return "";
  }
}

function unescapePdfString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractPdfTextTokens(buffer: ArrayBuffer): string[] {
  try {
    const raw = decodePdfBinary(buffer);
    const tokens: string[] = [];

    const parenRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let match: RegExpExecArray | null = parenRegex.exec(raw);
    while (match !== null) {
      const text = unescapePdfString(match[1]).trim();
      if (text.length > 0 && /[\w]/.test(text)) {
        tokens.push(text);
      }
      match = parenRegex.exec(raw);
    }

    if (tokens.length > 0) {
      return tokens;
    }

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null = streamRegex.exec(raw);
    while (streamMatch !== null) {
      const chunk = streamMatch[1]
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (chunk.length > 8) {
        tokens.push(chunk);
      }
      streamMatch = streamRegex.exec(raw);
    }

    return tokens;
  } catch {
    return [];
  }
}

function matrixFromPdfBuffer(buffer: ArrayBuffer): { matrix: string[][]; warnings: string[] } {
  const warnings: string[] = [];
  const tokens = extractPdfTextTokens(buffer);

  if (tokens.length === 0) {
    warnings.push(
      "Unable to extract readable text from the PDF. Ensure the sheet contains selectable attendance data."
    );
    return { matrix: [], warnings };
  }

  const lines = tokens.flatMap((token) =>
    token
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );

  const matrix: string[][] = [];

  for (const line of lines) {
    try {
      const row = splitDelimitedLine(line);
      if (row.some((cell) => cell.length > 0)) {
        matrix.push(row);
      }
    } catch {
      continue;
    }
  }

  if (matrix.length === 0) {
    warnings.push("The PDF did not contain tabular attendance rows.");
  }

  return { matrix, warnings };
}

function findHeaderRowIndex(matrix: string[][]): number {
  for (let index = 0; index < Math.min(matrix.length, 25); index += 1) {
    try {
      const rawRow = matrix[index] ?? [];
      const normalized = rawRow.map(normalizeHeader);
      const probe = rawRow
        .map((cell, cellIndex) => `${cell} ${normalized[cellIndex] ?? ""}`)
        .join(" ");

      const biometricMatch = detectBiometricLayout(rawRow, normalized);

      const fuzzyMatch =
        biometricMatch ||
        FUZZY_CODE_PATTERNS.some((pattern) => pattern.test(probe)) ||
        FUZZY_NAME_PATTERNS.some((pattern) => pattern.test(probe)) ||
        FUZZY_STATUS_PATTERNS.some((pattern) => pattern.test(probe));

      const exactMatch =
        normalized.some((cell) => CODE_HEADERS.has(cell)) ||
        normalized.some((cell) => NAME_HEADERS.has(cell)) ||
        normalized.some((cell) => STATUS_HEADERS.has(cell));

      if (fuzzyMatch || exactMatch) {
        return index;
      }
    } catch {
      continue;
    }
  }
  return 0;
}

function findColumnIndex(headers: string[], candidates: Set<string>): number {
  return headers.findIndex((cell) => candidates.has(cell));
}

function findFuzzyColumnIndex(
  rawHeaders: string[],
  normalizedHeaders: string[],
  patterns: RegExp[],
  excludeIndices: number[] = []
): number {
  for (let index = 0; index < rawHeaders.length; index += 1) {
    if (excludeIndices.includes(index)) continue;

    const raw = String(rawHeaders[index] ?? "").trim();
    const normalized = normalizedHeaders[index] ?? "";
    const probe = `${raw} ${normalized}`;

    if (patterns.some((pattern) => pattern.test(probe))) {
      return index;
    }
  }

  return -1;
}

type ImportColumnMap = {
  codeIndex: number;
  nameIndex: number;
  dateIndex: number;
  statusIndex: number;
  shiftIndex: number;
  otIndex: number;
  otShiftIndex: number;
  remarksIndex: number;
  isBiometricLayout?: boolean;
  serialIndex?: number;
  departmentIndex?: number;
  designationIndex?: number;
  startInIndex?: number;
  lunchOutIndex?: number;
  lunchInIndex?: number;
  outIndex?: number;
  hoursWorkedIndex?: number;
  earlyArrivalIndex?: number;
  shiftLateIndex?: number;
  earlyAccessIndex?: number;
  lunchIndex?: number;
  overtimeAmountIndex?: number;
  overStayIndex?: number;
  manualIndex?: number;
};

function buildBiometricColumnMap(
  rawHeaderCells: string[],
  normalizedHeaderCells: string[]
): ImportColumnMap {
  const exclude: number[] = [];

  const take = (patterns: RegExp[], extraExclude: number[] = []) => {
    const index = findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, patterns, [
      ...exclude,
      ...extraExclude,
    ]);
    if (index >= 0) exclude.push(index);
    return index;
  };

  const serialIndex = take([/serial/i, /s\.?\s*no/i, /sr\.?\s*no/i]);
  const codeIndex = take([/pay\s*code/i, /card\s*number/i, /cardnumber/i, /paycode/i, /code/i, /\bid\b/i, /emp/i]);
  const nameIndex = take([/employee\s*name/i, /emp\s*name/i, /^name$/i, /worker/i, /staff/i]);
  const departmentIndex = take([/department/i, /dept/i]);
  const designationIndex = take([/designation/i, /title/i, /role/i]);
  const shiftIndex = findBiometricShiftColumnIndex(rawHeaderCells, normalizedHeaderCells, exclude);
  if (shiftIndex >= 0) exclude.push(shiftIndex);
  const startInIndex = take([/start\s*in/i, /in\s*time/i, /punch\s*in/i]);
  const lunchOutIndex = take([/lunch\s*out/i]);
  const lunchInIndex = take([/lunch\s*in/i]);
  const outIndex = take([/^out$/i, /out\s*time/i, /punch\s*out/i]);
  const hoursWorkedIndex = take([/hours\s*worked/i, /thehoursworked/i, /total\s*hours/i]);
  const statusIndex = take([/^status$/i, /attendance/i, /present/i]);
  const earlyArrivalIndex = take([/early\s*arrival/i]);
  const shiftLateIndex = take([/shift\s*late/i, /late/i]);
  const earlyAccessIndex = take([/early\s*access/i]);
  const lunchIndex = take([/^lunch$/i]);
  const otIndex = take([/^ot$/i, /overtime(?!\s*amount)/i, /othours/i]);
  const overtimeAmountIndex = take([/overtime\s*amount/i, /otamount/i]);
  const overStayIndex = take([/over\s*stay/i, /overstay/i]);
  const manualIndex = take([/^manual$/i, /remarks/i, /notes/i]);

  const resolved: ImportColumnMap = {
    codeIndex,
    nameIndex,
    dateIndex: -1,
    statusIndex,
    shiftIndex,
    otIndex,
    otShiftIndex: overtimeAmountIndex >= 0 ? overtimeAmountIndex : otIndex,
    remarksIndex: manualIndex >= 0 ? manualIndex : -1,
    isBiometricLayout: true,
    serialIndex,
    departmentIndex,
    designationIndex,
    startInIndex,
    lunchOutIndex,
    lunchInIndex,
    outIndex,
    hoursWorkedIndex,
    earlyArrivalIndex,
    shiftLateIndex,
    earlyAccessIndex,
    lunchIndex,
    overtimeAmountIndex,
    overStayIndex,
    manualIndex,
  };

  const columnCount = Math.max(rawHeaderCells.length, normalizedHeaderCells.length);
  if (columnCount >= BIOMETRIC_MIN_COLUMNS) {
    const assignIfMissing = (key: keyof ImportColumnMap, position: number) => {
      const current = resolved[key];
      if (typeof current === "number" && current < 0 && position < columnCount) {
        (resolved[key] as number) = position;
      }
    };

    assignIfMissing("serialIndex", BIOMETRIC_POSITIONAL_LAYOUT.serialIndex);
    assignIfMissing("codeIndex", BIOMETRIC_POSITIONAL_LAYOUT.codeIndex);
    assignIfMissing("nameIndex", BIOMETRIC_POSITIONAL_LAYOUT.nameIndex);
    assignIfMissing("departmentIndex", BIOMETRIC_POSITIONAL_LAYOUT.departmentIndex);
    assignIfMissing("designationIndex", BIOMETRIC_POSITIONAL_LAYOUT.designationIndex);
    assignIfMissing("shiftIndex", BIOMETRIC_POSITIONAL_LAYOUT.shiftIndex);
    assignIfMissing("startInIndex", BIOMETRIC_POSITIONAL_LAYOUT.startInIndex);
    assignIfMissing("lunchOutIndex", BIOMETRIC_POSITIONAL_LAYOUT.lunchOutIndex);
    assignIfMissing("lunchInIndex", BIOMETRIC_POSITIONAL_LAYOUT.lunchInIndex);
    assignIfMissing("outIndex", BIOMETRIC_POSITIONAL_LAYOUT.outIndex);
    assignIfMissing("hoursWorkedIndex", BIOMETRIC_POSITIONAL_LAYOUT.hoursWorkedIndex);
    assignIfMissing("statusIndex", BIOMETRIC_POSITIONAL_LAYOUT.statusIndex);
    assignIfMissing("earlyArrivalIndex", BIOMETRIC_POSITIONAL_LAYOUT.earlyArrivalIndex);
    assignIfMissing("shiftLateIndex", BIOMETRIC_POSITIONAL_LAYOUT.shiftLateIndex);
    assignIfMissing("earlyAccessIndex", BIOMETRIC_POSITIONAL_LAYOUT.earlyAccessIndex);
    assignIfMissing("lunchIndex", BIOMETRIC_POSITIONAL_LAYOUT.lunchIndex);
    assignIfMissing("otIndex", BIOMETRIC_POSITIONAL_LAYOUT.otIndex);
    assignIfMissing("overtimeAmountIndex", BIOMETRIC_POSITIONAL_LAYOUT.overtimeAmountIndex);
    assignIfMissing("overStayIndex", BIOMETRIC_POSITIONAL_LAYOUT.overStayIndex);
    assignIfMissing("manualIndex", BIOMETRIC_POSITIONAL_LAYOUT.manualIndex);
  }

  if (resolved.codeIndex < 0) resolved.codeIndex = BIOMETRIC_POSITIONAL_LAYOUT.codeIndex;
  if (resolved.nameIndex < 0) resolved.nameIndex = BIOMETRIC_POSITIONAL_LAYOUT.nameIndex;
  if (resolved.shiftIndex < 0) resolved.shiftIndex = BIOMETRIC_POSITIONAL_LAYOUT.shiftIndex;
  if (resolved.statusIndex < 0) resolved.statusIndex = BIOMETRIC_POSITIONAL_LAYOUT.statusIndex;
  if (resolved.otIndex < 0) resolved.otIndex = BIOMETRIC_POSITIONAL_LAYOUT.otIndex;
  if (resolved.overtimeAmountIndex == null || resolved.overtimeAmountIndex < 0) {
    resolved.overtimeAmountIndex = BIOMETRIC_POSITIONAL_LAYOUT.overtimeAmountIndex;
  }
  if (resolved.otShiftIndex < 0) {
    resolved.otShiftIndex = resolved.overtimeAmountIndex;
  }

  return resolved;
}

function buildFallbackColumnMap(
  rawHeaderCells: string[],
  normalizedHeaderCells: string[],
  sampleRows: string[][]
): ImportColumnMap {
  if (shouldUseBiometricLayout(rawHeaderCells, normalizedHeaderCells, sampleRows)) {
    return buildBiometricColumnMap(rawHeaderCells, normalizedHeaderCells);
  }
  const codeIndex =
    findColumnIndex(normalizedHeaderCells, CODE_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, CODE_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_CODE_PATTERNS);

  const nameIndex =
    findColumnIndex(normalizedHeaderCells, NAME_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, NAME_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_NAME_PATTERNS, [
          codeIndex,
        ]);

  const dateIndex =
    findColumnIndex(normalizedHeaderCells, DATE_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, DATE_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_DATE_PATTERNS, [
          codeIndex,
          nameIndex,
        ]);

  const statusIndex =
    findColumnIndex(normalizedHeaderCells, STATUS_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, STATUS_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_STATUS_PATTERNS, [
          codeIndex,
          nameIndex,
          dateIndex,
        ]);

  const shiftIndex =
    findColumnIndex(normalizedHeaderCells, SHIFT_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, SHIFT_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_SHIFT_PATTERNS, [
          codeIndex,
          nameIndex,
          dateIndex,
          statusIndex,
        ]);

  const otShiftIndex =
    findColumnIndex(normalizedHeaderCells, OT_SHIFT_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, OT_SHIFT_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_OT_SHIFT_PATTERNS, [
          codeIndex,
          nameIndex,
          dateIndex,
          statusIndex,
          shiftIndex,
        ]);

  const otIndex =
    findColumnIndex(normalizedHeaderCells, OT_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, OT_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_OT_PATTERNS, [
          codeIndex,
          nameIndex,
          dateIndex,
          statusIndex,
          shiftIndex,
          otShiftIndex,
        ]);

  const remarksIndex =
    findColumnIndex(normalizedHeaderCells, REMARKS_HEADERS) >= 0
      ? findColumnIndex(normalizedHeaderCells, REMARKS_HEADERS)
      : findFuzzyColumnIndex(rawHeaderCells, normalizedHeaderCells, FUZZY_REMARKS_PATTERNS, [
          codeIndex,
          nameIndex,
          dateIndex,
          statusIndex,
          shiftIndex,
          otShiftIndex,
          otIndex,
        ]);

  const resolved: ImportColumnMap = {
    codeIndex,
    nameIndex,
    dateIndex,
    statusIndex,
    shiftIndex,
    otIndex,
    otShiftIndex,
    remarksIndex,
  };

  const maxColumns = Math.max(
    normalizedHeaderCells.length,
    ...sampleRows.slice(0, 5).map((row) => (Array.isArray(row) ? row.length : 0)),
    1
  );

  if (resolved.codeIndex < 0 && maxColumns > 0) resolved.codeIndex = 0;
  if (resolved.nameIndex < 0 && maxColumns > 1) resolved.nameIndex = 1;
  if (resolved.dateIndex < 0 && maxColumns > 2) resolved.dateIndex = 2;
  if (resolved.statusIndex < 0 && maxColumns > 3) resolved.statusIndex = 3;
  if (resolved.shiftIndex < 0 && maxColumns > 4) resolved.shiftIndex = 4;
  if (resolved.otShiftIndex < 0 && maxColumns > 5) resolved.otShiftIndex = 5;
  if (resolved.otIndex < 0 && maxColumns > 5) resolved.otIndex = 5;
  if (resolved.remarksIndex < 0 && maxColumns > 6) resolved.remarksIndex = 6;

  if (resolved.nameIndex < 0 && resolved.codeIndex >= 0) {
    resolved.nameIndex = resolved.codeIndex + 1;
  }

  return resolved;
}

function normalizeRowWidth(rows: string[][]): string[][] {
  try {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    let maxWidth = 0;
    for (const row of rows) {
      if (Array.isArray(row)) {
        maxWidth = Math.max(maxWidth, row.length);
      }
    }

    if (maxWidth === 0) return rows;

    return rows.map((row) => {
      if (!Array.isArray(row)) return Array.from({ length: maxWidth }, () => "");
      if (row.length >= maxWidth) return row;
      return [...row, ...Array.from({ length: maxWidth - row.length }, () => "")];
    });
  } catch {
    return [];
  }
}

function normalizeAttendanceDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return todayIsoDate();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (slashMatch) {
    const day = slashMatch[1]!.padStart(2, "0");
    const month = slashMatch[2]!.padStart(2, "0");
    let year = slashMatch[3]!;
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return todayIsoDate();
}

function safeCell(cells: unknown, index: number): string {
  try {
    if (!Array.isArray(cells) || index < 0 || index >= cells.length) return "";
    return safeString(cells[index]);
  } catch {
    return "";
  }
}

function parseGenericImportRow(
  cells: unknown,
  columnMap: ImportColumnMap
): Partial<AttendanceImportRow> | null {
  try {
    const rowCells = Array.isArray(cells)
      ? cells.map((cell) => safeString(cell))
      : buildBiometricSanitizationMatrix(cells);

    if (!rowHasContent(rowCells)) {
      return null;
    }

    let employeeCode = safeCell(rowCells, columnMap.codeIndex);
    let employeeName =
      safeCell(rowCells, columnMap.nameIndex) ||
      (columnMap.codeIndex >= 0
        ? safeCell(rowCells, columnMap.codeIndex + 1)
        : safeCell(rowCells, 0));

    if (!employeeName && !employeeCode) {
      const seed = rowCells.find((cell) => safeString(cell).length > 0) ?? "";
      employeeCode = deriveAutoEmployeeCode(safeString(seed));
      employeeName = safeString(seed) || FALLBACK_EMPLOYEE_NAME;
    }

    const statusRaw = safeCell(rowCells, columnMap.statusIndex);
    const shiftRaw = safeCell(rowCells, columnMap.shiftIndex);
    const otShiftRaw =
      safeCell(rowCells, columnMap.otShiftIndex) || safeCell(rowCells, columnMap.otIndex);

    return {
      employeeCode: employeeCode || FALLBACK_EMPLOYEE_CODE,
      employeeName: employeeName || FALLBACK_EMPLOYEE_NAME,
      attendanceDate: normalizeAttendanceDate(safeCell(rowCells, columnMap.dateIndex)),
      status: parseStatus(statusRaw || BIOMETRIC_DAY_CODE, shiftRaw),
      overtimeShift: parseOvertimeShift(otShiftRaw),
      remarks: safeCell(rowCells, columnMap.remarksIndex),
    };
  } catch {
    return null;
  }
}

export function parseAttendanceImportMatrix(matrix: string[][]): AttendanceImportRow[] {
  return parseAttendanceImportMatrixSafe(matrix).rows;
}

export function parseAttendanceImportMatrixSafe(
  matrix: string[][]
): AttendanceImportParseOutcome {
  const warnings: string[] = [];
  let skippedRows = 0;

  try {
    const sanitized = normalizeRowWidth(sanitizeMatrix(matrix));
    if (sanitized.length === 0) {
      return { rows: [], skippedRows: 0, warnings };
    }

    const headerRowIndex = findHeaderRowIndex(sanitized);
    const rawHeaderCells = sanitized[headerRowIndex] ?? [];
    const headerCells = rawHeaderCells.map(normalizeHeader);
    const dataRows = sanitized.slice(headerRowIndex + 1);
    const columnMap = buildFallbackColumnMap(rawHeaderCells, headerCells, dataRows);

    if (columnMap.isBiometricLayout) {
      warnings.push(
        "Industrial biometric 25+ column layout detected. Sanitization matrix applied with crash-proof field extraction."
      );
    }

    const usedFallback =
      !columnMap.isBiometricLayout &&
      findColumnIndex(headerCells, CODE_HEADERS) < 0 &&
      findFuzzyColumnIndex(rawHeaderCells, headerCells, FUZZY_CODE_PATTERNS) < 0 &&
      findColumnIndex(headerCells, NAME_HEADERS) < 0 &&
      findFuzzyColumnIndex(rawHeaderCells, headerCells, FUZZY_NAME_PATTERNS) < 0;

    if (usedFallback) {
      warnings.push(
        "Header row was shifted or missing. Fuzzy positional column mapping was applied with sanitized defaults."
      );
    }

    if (columnMap.nameIndex < 0 && columnMap.codeIndex < 0) {
      warnings.push(
        "Employee Code and Employee Name columns could not be resolved. Positional defaults will be used."
      );
      columnMap.codeIndex = 0;
      columnMap.nameIndex = 1;
    }

    const rows: AttendanceImportRow[] = [];

    for (const cells of dataRows) {
      try {
        const hasContent = Array.isArray(cells)
          ? cells.some((cell) => safeString(cell).length > 0)
          : buildBiometricSanitizationMatrix(cells).some((cell) => cell.length > 0);

        if (!hasContent) {
          skippedRows += 1;
          continue;
        }

        rows.push(processRowThroughSanitizationMatrix(cells, columnMap));
      } catch {
        rows.push(
          finalizeImportRow({
            employeeCode: FALLBACK_EMPLOYEE_CODE,
            employeeName: FALLBACK_EMPLOYEE_NAME,
            status: DEFAULT_IMPORT_STATUS,
            remarks: "Recovered during bulk row sanitization.",
          })
        );
        warnings.push("One row was recovered using fallback attendance values.");
      }
    }

    const finalizedRows = rows.map((row) => finalizeImportRow(row));

    if (skippedRows > 0) {
      warnings.push(`${skippedRows} malformed row(s) were skipped during import sanitization.`);
    }

    return { rows: finalizedRows, skippedRows, warnings };
  } catch {
    warnings.push("Unexpected matrix parse failure. Returning empty sanitized result.");
    return { rows: [], skippedRows: 0, warnings };
  }
}

async function readFileAsArrayBufferResilient(file: File): Promise<ArrayBuffer> {
  try {
    if (typeof file.arrayBuffer === "function") {
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength > 0) return buffer;
    }
  } catch {
    // Fall through to FileReader.
  }

  return readFileAsArrayBuffer(file);
}

function tryMatrixFromEmbeddedCsvText(buffer: ArrayBuffer): string[][] {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const text = decoder.decode(buffer);
    if (!text.includes(",") && !text.includes("\t")) return [];
    const matrix = matrixFromCsvText(text);
    return matrix.length > 0 ? matrix : [];
  } catch {
    return [];
  }
}

function mergeParseOutcomes(
  primary: AttendanceImportParseOutcome,
  secondary: AttendanceImportParseOutcome
): AttendanceImportParseOutcome {
  if (primary.rows.length > 0) {
    return {
      rows: primary.rows,
      skippedRows: primary.skippedRows + secondary.skippedRows,
      warnings: [...primary.warnings, ...secondary.warnings],
    };
  }

  return {
    rows: secondary.rows,
    skippedRows: primary.skippedRows + secondary.skippedRows,
    warnings: [...primary.warnings, ...secondary.warnings],
  };
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (!(reader.result instanceof ArrayBuffer)) {
            reject(new Error("Failed to read file as binary data."));
            return;
          }
          resolve(reader.result);
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error("Failed to process the selected file buffer.")
          );
        }
      };
      reader.onerror = () => reject(new Error("Failed to read the selected file."));
      reader.onabort = () => reject(new Error("File read was cancelled."));
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(
        error instanceof Error ? error : new Error("Unable to initialize file reader for upload.")
      );
    }
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read the selected file."));
      reader.onabort = () => reject(new Error("File read was cancelled."));
      reader.readAsText(file);
    } catch (error) {
      reject(
        error instanceof Error ? error : new Error("Unable to initialize file reader for upload.")
      );
    }
  });
}

function resolveFileExtension(file: File): string {
  const fromName = file.name.toLowerCase().split(".").pop() ?? "";
  if (fromName) return fromName;

  const mime = file.type.toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("csv")) return "csv";
  if (mime.includes("sheet") || mime.includes("excel")) return "xlsx";
  return "";
}

export async function parseAttendanceImportFileSafe(
  file: File
): Promise<AttendanceImportParseOutcome> {
  const warnings: string[] = [];

  try {
    if (!file || file.size === 0) {
      return {
        rows: [],
        skippedRows: 0,
        warnings: ["The selected file is empty."],
      };
    }

    const extension = resolveFileExtension(file);

    if (extension === "csv") {
      try {
        const text = await readFileAsText(file);
        const outcome = parseAttendanceImportMatrixSafe(matrixFromCsvText(text));
        return { ...outcome, warnings: [...warnings, ...outcome.warnings] };
      } catch {
        try {
          const buffer = await readFileAsArrayBufferResilient(file);
          const fallback = parseAttendanceImportMatrixSafe(tryMatrixFromEmbeddedCsvText(buffer));
          warnings.push("CSV text decode failed. Recovered rows from embedded buffer text.");
          return { ...fallback, warnings: [...warnings, ...fallback.warnings] };
        } catch {
          return {
            rows: [],
            skippedRows: 0,
            warnings: [...warnings, "CSV import failed safely with zero runtime exceptions."],
          };
        }
      }
    }

    if (extension === "xlsx" || extension === "xls") {
      try {
        const buffer = await readFileAsArrayBufferResilient(file);
        const { matrix, warnings: excelWarnings } = await matrixFromExcelBuffer(buffer, extension);
        warnings.push(...excelWarnings);

        let outcome = parseAttendanceImportMatrixSafe(matrix);

        if (outcome.rows.length === 0) {
          const csvMatrix = tryMatrixFromEmbeddedCsvText(buffer);
          if (csvMatrix.length > 0) {
            const csvOutcome = parseAttendanceImportMatrixSafe(csvMatrix);
            outcome = mergeParseOutcomes(outcome, csvOutcome);
            warnings.push("Excel decode fallback recovered rows from embedded delimited text.");
          }
        }

        return { ...outcome, warnings: [...warnings, ...outcome.warnings] };
      } catch {
        return {
          rows: [],
          skippedRows: 0,
          warnings: [...warnings, "Excel import failed safely with zero runtime exceptions."],
        };
      }
    }

    if (extension === "pdf") {
      try {
        const buffer = await readFileAsArrayBufferResilient(file);
        const { matrix, warnings: pdfWarnings } = matrixFromPdfBuffer(buffer);
        warnings.push(...pdfWarnings);
        const outcome = parseAttendanceImportMatrixSafe(matrix);
        return { ...outcome, warnings: [...warnings, ...outcome.warnings] };
      } catch {
        return {
          rows: [],
          skippedRows: 0,
          warnings: [...warnings, "PDF import failed safely with zero runtime exceptions."],
        };
      }
    }

    return {
      rows: [],
      skippedRows: 0,
      warnings: [...warnings, "Unsupported file type. Upload a .xlsx, .xls, .pdf, or .csv file."],
    };
  } catch {
    return {
      rows: [],
      skippedRows: 0,
      warnings: [...warnings, "File import terminated safely without crashing the application."],
    };
  }
}

export async function parseAttendanceImportFile(file: File): Promise<AttendanceImportRow[]> {
  const outcome = await parseAttendanceImportFileSafe(file);
  return outcome.rows;
}
