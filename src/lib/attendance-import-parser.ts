import * as XLSX from "xlsx";
import type { ManualAttendanceStatus } from "@/types/manual-attendance-entry";

export type AttendanceImportRow = {
  employeeName: string;
  attendanceDate: string;
  status: ManualAttendanceStatus;
  overtimeHours: number;
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
  const nameIndex = headerCells.findIndex((cell) =>
    ["employeename", "staffname", "name", "employee"].includes(cell)
  );
  const dateIndex = headerCells.findIndex((cell) =>
    ["attendancedate", "date", "workdate"].includes(cell)
  );
  const statusIndex = headerCells.findIndex((cell) => cell === "status");
  const otIndex = headerCells.findIndex((cell) =>
    ["overtimehours", "overtime", "othours"].includes(cell)
  );
  const remarksIndex = headerCells.findIndex((cell) =>
    ["remarks", "notes", "shiftinfo"].includes(cell)
  );

  if (nameIndex < 0 && dateIndex < 0) {
    throw new Error(
      "Invalid file structure. Include at least Employee Name and Date column headers."
    );
  }

  const rows: AttendanceImportRow[] = [];

  for (const cells of matrix.slice(1)) {
    const employeeName = cells[nameIndex >= 0 ? nameIndex : 0]?.trim() ?? "";
    const attendanceDate = cells[dateIndex >= 0 ? dateIndex : 1]?.trim() ?? "";
    const statusRaw = (cells[statusIndex >= 0 ? statusIndex : 2]?.trim() ?? "present")
      .toLowerCase()
      .replace(/\s+/g, "_") as ManualAttendanceStatus;
    const status = VALID_STATUSES.has(statusRaw) ? statusRaw : "present";
    const overtimeHours = Number(cells[otIndex >= 0 ? otIndex : 3]) || 0;
    const remarks = cells[remarksIndex >= 0 ? remarksIndex : 4]?.trim() ?? "";

    if (!employeeName || !attendanceDate) continue;

    rows.push({ employeeName, attendanceDate, status, overtimeHours, remarks });
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
