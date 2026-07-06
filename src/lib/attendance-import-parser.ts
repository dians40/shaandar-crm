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

function matrixFromCsvText(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

function matrixFromExcelBuffer(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("The Excel file does not contain any worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("The Excel worksheet is empty.");
  }

  return rawRows
    .map((row) => (Array.isArray(row) ? row.map(cellToString) : [cellToString(row)]))
    .filter((row) => row.some((cell) => cell.length > 0));
}

export function parseAttendanceImportMatrix(matrix: string[][]): AttendanceImportRow[] {
  if (matrix.length === 0) return [];

  const headerCells = matrix[0].map(normalizeHeader);
  const codeIndex = headerCells.findIndex((cell) =>
    ["employeecode", "employeeid", "staffcode", "code", "empid"].includes(cell)
  );
  const nameIndex = headerCells.findIndex((cell) =>
    ["employeename", "staffname", "name", "employee"].includes(cell)
  );
  const dateIndex = headerCells.findIndex((cell) =>
    ["attendancedate", "date", "workdate"].includes(cell)
  );
  const statusIndex = headerCells.findIndex((cell) => cell === "status");
  const shiftIndex = headerCells.findIndex((cell) =>
    ["workshift", "shift", "dayshift"].includes(cell)
  );
  const otIndex = headerCells.findIndex((cell) =>
    ["overtimehours", "overtime", "othours"].includes(cell)
  );
  const otShiftIndex = headerCells.findIndex((cell) =>
    ["overtimeshift", "otshift", "overtimeband"].includes(cell)
  );
  const remarksIndex = headerCells.findIndex((cell) =>
    ["remarks", "notes", "shiftinfo"].includes(cell)
  );

  if (nameIndex < 0 && codeIndex < 0) {
    throw new Error(
      "Invalid file structure. Include Employee Code and/or Employee Name column headers."
    );
  }

  if (dateIndex < 0) {
    throw new Error("Invalid file structure. Include a Date column header.");
  }

  const rows: AttendanceImportRow[] = [];

  for (const cells of matrix.slice(1)) {
    const employeeCode = cells[codeIndex >= 0 ? codeIndex : -1]?.trim() ?? "";
    const employeeName =
      cells[nameIndex >= 0 ? nameIndex : codeIndex >= 0 ? codeIndex + 1 : 0]?.trim() ?? "";
    const attendanceDate = cells[dateIndex]?.trim() ?? "";
    const statusRaw = (cells[statusIndex >= 0 ? statusIndex : -1]?.trim() ?? "present")
      .toLowerCase()
      .replace(/\s+/g, "_") as ManualAttendanceStatus;
    const status = VALID_STATUSES.has(statusRaw) ? statusRaw : "present";
    const workShift = parseWorkShift(cells[shiftIndex >= 0 ? shiftIndex : -1]?.trim() ?? "");
    const overtimeHours = Number(cells[otIndex >= 0 ? otIndex : -1]) || 0;
    const overtimeShift = parseOvertimeShift(
      cells[otShiftIndex >= 0 ? otShiftIndex : -1]?.trim() ?? ""
    );
    const remarks = cells[remarksIndex >= 0 ? remarksIndex : -1]?.trim() ?? "";

    if ((!employeeName && !employeeCode) || !attendanceDate) continue;

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

export async function parseAttendanceImportFile(file: File): Promise<AttendanceImportRow[]> {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";

  if (extension === "csv") {
    const text = await file.text();
    return parseAttendanceImportMatrix(matrixFromCsvText(text));
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    return parseAttendanceImportMatrix(matrixFromExcelBuffer(buffer));
  }

  throw new Error("Unsupported file type. Upload a .csv, .xlsx, or .xls file.");
}
