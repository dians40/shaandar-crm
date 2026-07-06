import * as XLSX from "xlsx";
import type {
  ManualAttendanceStatus,
  OvertimeShiftType,
  WorkShift,
} from "@/types/manual-attendance-entry";

export type AttendanceImportRow = {
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  status: ManualAttendanceStatus;
  workShift: WorkShift | "";
  overtimeHours: number;
  overtimeShift: OvertimeShiftType | "";
  remarks: string;
};

const VALID_STATUSES = new Set<ManualAttendanceStatus>([
  "present",
  "absent",
  "half_day",
  "paid_leave",
]);

const CODE_HEADERS = new Set([
  "employeecode",
  "employeeid",
  "staffcode",
  "code",
  "empid",
  "empcode",
]);

const NAME_HEADERS = new Set([
  "employeename",
  "staffname",
  "name",
  "employee",
  "fullname",
]);

const DATE_HEADERS = new Set(["attendancedate", "date", "workdate", "attdate"]);

const STATUS_HEADERS = new Set([
  "status",
  "attendancestatus",
  "attendance",
  "attstatus",
  "presentstatus",
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cellToString(cell: unknown): string {
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }

  if (typeof cell === "number" && Number.isFinite(cell) && cell > 30000 && cell < 70000) {
    const parsed = XLSX.SSF.parse_date_code(cell);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  return String(cell ?? "").trim();
}

function parseCsvLine(line: string): string[] {
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
}

function parseWorkShift(value: string): WorkShift | "" {
  const normalized = value.toLowerCase();
  if (normalized.includes("night")) return "night";
  if (normalized.includes("day")) return "day";
  return "";
}

function parseOvertimeShift(value: string): OvertimeShiftType | "" {
  const normalized = value.toLowerCase();
  if (normalized.includes("night")) return "night_overtime";
  if (normalized.includes("day")) return "day_overtime";
  return "";
}

function parseStatus(value: string): ManualAttendanceStatus {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (VALID_STATUSES.has(normalized as ManualAttendanceStatus)) {
    return normalized as ManualAttendanceStatus;
  }

  if (normalized.includes("half")) return "half_day";
  if (normalized.includes("leave")) return "paid_leave";
  if (normalized.includes("absent")) return "absent";
  if (normalized.includes("present") || normalized === "p") return "present";

  return "present";
}

function splitDelimitedLine(line: string): string[] {
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
}

function matrixFromCsvText(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes(",") ? parseCsvLine(line) : splitDelimitedLine(line)));
}

function matrixFromExcelBuffer(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The Excel file does not contain any worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("The Excel worksheet is empty.");
  }

  return rawRows
    .map((row) => (Array.isArray(row) ? row.map(cellToString) : [cellToString(row)]))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function decodePdfBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let raw = "";
  const chunkSize = 65536;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    raw += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return raw;
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
}

function matrixFromPdfBuffer(buffer: ArrayBuffer): string[][] {
  const tokens = extractPdfTextTokens(buffer);
  if (tokens.length === 0) {
    throw new Error(
      "Unable to extract readable rows from the PDF. Ensure the sheet contains selectable text attendance data."
    );
  }

  const lines = tokens.flatMap((token) =>
    token
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );

  const matrix = lines.map(splitDelimitedLine).filter((row) => row.some((cell) => cell.length > 0));

  if (matrix.length === 0) {
    throw new Error("The PDF did not contain tabular attendance rows.");
  }

  return matrix;
}

function findHeaderRowIndex(matrix: string[][]): number {
  for (let index = 0; index < Math.min(matrix.length, 15); index += 1) {
    const normalized = matrix[index].map(normalizeHeader);
    const hasCode = normalized.some((cell) => CODE_HEADERS.has(cell));
    const hasName = normalized.some((cell) => NAME_HEADERS.has(cell));
    const hasStatus = normalized.some((cell) => STATUS_HEADERS.has(cell));
    if (hasCode || hasName || hasStatus) {
      return index;
    }
  }
  return 0;
}

function findColumnIndex(headers: string[], candidates: Set<string>): number {
  return headers.findIndex((cell) => candidates.has(cell));
}

export function parseAttendanceImportMatrix(matrix: string[][]): AttendanceImportRow[] {
  if (matrix.length === 0) return [];

  const headerRowIndex = findHeaderRowIndex(matrix);
  const headerCells = matrix[headerRowIndex].map(normalizeHeader);
  const codeIndex = findColumnIndex(headerCells, CODE_HEADERS);
  const nameIndex = findColumnIndex(headerCells, NAME_HEADERS);
  const dateIndex = findColumnIndex(headerCells, DATE_HEADERS);
  const statusIndex = findColumnIndex(headerCells, STATUS_HEADERS);
  const shiftIndex = findColumnIndex(headerCells, SHIFT_HEADERS);
  const otIndex = findColumnIndex(headerCells, OT_HEADERS);
  const otShiftIndex = findColumnIndex(headerCells, OT_SHIFT_HEADERS);
  const remarksIndex = findColumnIndex(headerCells, REMARKS_HEADERS);

  if (nameIndex < 0 && codeIndex < 0) {
    throw new Error(
      "Invalid file structure. Include Employee Code and/or Employee Name column headers."
    );
  }

  const rows: AttendanceImportRow[] = [];

  for (const cells of matrix.slice(headerRowIndex + 1)) {
    const employeeCode = cells[codeIndex >= 0 ? codeIndex : -1]?.trim() ?? "";
    const employeeName =
      cells[nameIndex >= 0 ? nameIndex : codeIndex >= 0 ? codeIndex + 1 : 0]?.trim() ?? "";
    const attendanceDate =
      (dateIndex >= 0 ? cells[dateIndex]?.trim() : "") || todayIsoDate();
    const statusRaw = cells[statusIndex >= 0 ? statusIndex : -1]?.trim() ?? "present";
    const status = parseStatus(statusRaw);
    const workShift = parseWorkShift(cells[shiftIndex >= 0 ? shiftIndex : -1]?.trim() ?? "");
    const overtimeHours = Number(cells[otIndex >= 0 ? otIndex : -1]) || 0;
    const overtimeShift = parseOvertimeShift(
      cells[otShiftIndex >= 0 ? otShiftIndex : -1]?.trim() ?? ""
    );
    const remarks = cells[remarksIndex >= 0 ? remarksIndex : -1]?.trim() ?? "";

    if (!employeeName && !employeeCode) continue;

    rows.push({
      employeeCode,
      employeeName: employeeName || employeeCode,
      attendanceDate,
      status,
      workShift:
        workShift ||
        (status === "present" || status === "half_day" ? ("day" as WorkShift) : ""),
      overtimeHours,
      overtimeShift,
      remarks,
    });
  }

  return rows;
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error("Failed to read file as binary data."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsText(file);
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

export async function parseAttendanceImportFile(file: File): Promise<AttendanceImportRow[]> {
  const extension = resolveFileExtension(file);

  if (extension === "csv") {
    const text = await readFileAsText(file);
    return parseAttendanceImportMatrix(matrixFromCsvText(text));
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await readFileAsArrayBuffer(file);
    return parseAttendanceImportMatrix(matrixFromExcelBuffer(buffer));
  }

  if (extension === "pdf") {
    const buffer = await readFileAsArrayBuffer(file);
    return parseAttendanceImportMatrix(matrixFromPdfBuffer(buffer));
  }

  throw new Error("Unsupported file type. Upload a .xlsx, .xls, .pdf, or .csv file.");
}
