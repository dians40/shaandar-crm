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

type XlsxModule = typeof import("xlsx");

let xlsxModulePromise: Promise<XlsxModule> | null = null;

async function loadXlsxModule(): Promise<XlsxModule> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

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

function formatExcelSerialDate(serial: number, xlsx: XlsxModule): string {
  try {
    const parsed = xlsx.SSF?.parse_date_code?.(serial);
    if (!parsed) return String(serial);
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  } catch {
    return String(serial);
  }
}

function cellToString(cell: unknown, xlsx?: XlsxModule): string {
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

  if (typeof cell === "object") {
    const record = cell as Record<string, unknown>;
    if (typeof record.w === "string" && record.w.trim()) {
      return record.w.trim();
    }
    if ("v" in record) {
      return cellToString(record.v, xlsx);
    }
    if ("text" in record) {
      return cellToString(record.text, xlsx);
    }
    return "";
  }

  return String(cell).trim();
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

function bufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!);
  }
  return binary;
}

function readWorkbookFromBuffer(
  XLSX: XlsxModule,
  buffer: ArrayBuffer,
  extension: string
) {
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
        dense: true,
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
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  });

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return [];
  }

  return rawRows
    .map((row) => {
      if (Array.isArray(row)) {
        return row.map((cell) => cellToString(cell, XLSX));
      }
      return [cellToString(row, XLSX)];
    })
    .filter((row) => row.some((cell) => cell.length > 0));
}

async function matrixFromExcelBuffer(
  buffer: ArrayBuffer,
  extension: string
): Promise<string[][]> {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("The Excel file is empty.");
  }

  const XLSX = await loadXlsxModule();
  let workbook;

  try {
    workbook = readWorkbookFromBuffer(XLSX, buffer, extension);
  } catch {
    throw new Error(
      "Unable to parse the Excel workbook. Ensure the file is a valid .xlsx or .xls attendance sheet."
    );
  }

  if (!workbook.SheetNames.length) {
    throw new Error("The Excel file does not contain any worksheets.");
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const matrix = sheetToMatrix(XLSX, sheet);
    if (matrix.length > 0) {
      return matrix;
    }
  }

  throw new Error("The Excel worksheet is empty or contains no readable rows.");
}

function decodePdfBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let raw = "";
  for (let offset = 0; offset < bytes.length; offset += 1) {
    raw += String.fromCharCode(bytes[offset]!);
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

export async function parseAttendanceImportFile(file: File): Promise<AttendanceImportRow[]> {
  if (!file || file.size === 0) {
    throw new Error("The selected file is empty.");
  }

  const extension = resolveFileExtension(file);

  try {
    if (extension === "csv") {
      const text = await readFileAsText(file);
      return parseAttendanceImportMatrix(matrixFromCsvText(text));
    }

    if (extension === "xlsx" || extension === "xls") {
      const buffer = await readFileAsArrayBuffer(file);
      const matrix = await matrixFromExcelBuffer(buffer, extension);
      return parseAttendanceImportMatrix(matrix);
    }

    if (extension === "pdf") {
      const buffer = await readFileAsArrayBuffer(file);
      return parseAttendanceImportMatrix(matrixFromPdfBuffer(buffer));
    }

    throw new Error("Unsupported file type. Upload a .xlsx, .xls, .pdf, or .csv file.");
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unable to parse the uploaded attendance file.");
  }
}
