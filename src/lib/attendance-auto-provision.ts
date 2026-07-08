import type { EmployeeListItem } from "@/types/employee-list";
import { buildExcelImportEmployeeListItem } from "@/lib/excel-import-employee-defaults";

const AUTO_PROVISION_STORAGE_KEY = "shaandar-crm-auto-provisioned-employees";

export type AutoProvisionedEmployeeRecord = EmployeeListItem & {
  employeeCode: string;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function readAutoProvisionedEmployees(): AutoProvisionedEmployeeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUTO_PROVISION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AutoProvisionedEmployeeRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAutoProvisionedEmployees(records: AutoProvisionedEmployeeRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTO_PROVISION_STORAGE_KEY, JSON.stringify(records));
}

export function upsertAutoProvisionedEmployee(
  record: AutoProvisionedEmployeeRecord
): AutoProvisionedEmployeeRecord[] {
  const current = readAutoProvisionedEmployees();
  const code = normalizeCode(record.employeeCode);
  const next = [
    { ...record, employeeCode: code },
    ...current.filter((row) => normalizeCode(row.employeeCode) !== code),
  ];
  writeAutoProvisionedEmployees(next);
  return next;
}

export function createAutoProvisionedEmployee(
  employeeCode: string,
  employeeName: string,
  department = ""
): AutoProvisionedEmployeeRecord {
  const code = normalizeCode(employeeCode);
  const id = `auto-emp-${code.replace(/[^A-Z0-9]/g, "")}-${Date.now()}`;
  const profile = buildExcelImportEmployeeListItem(id, employeeName, department);

  return {
    id,
    employeeCode: code,
    ...profile,
    hasAttendanceRecords: false,
  };
}

export function findMasterEmployeeByName(
  employees: EmployeeListItem[],
  employeeName: string
): EmployeeListItem | undefined {
  const normalized = employeeName.trim().toLowerCase();
  return (
    employees.find((employee) => employee.name.toLowerCase() === normalized) ??
    employees.find((employee) => employee.name.toLowerCase().includes(normalized))
  );
}

export function resolveImportEmployee(
  employeeCode: string,
  employeeName: string,
  masterEmployees: EmployeeListItem[],
  autoProvisioned: AutoProvisionedEmployeeRecord[]
): EmployeeListItem | undefined {
  const code = normalizeCode(employeeCode);

  if (code) {
    const fromRegistry = autoProvisioned.find(
      (row) => normalizeCode(row.employeeCode) === code
    );
    if (fromRegistry) return fromRegistry;

    const fromMasterByCode = masterEmployees.find(
      (row) =>
        "employeeCode" in row &&
        typeof (row as AutoProvisionedEmployeeRecord).employeeCode === "string" &&
        normalizeCode((row as AutoProvisionedEmployeeRecord).employeeCode) === code
    );
    if (fromMasterByCode) return fromMasterByCode;

    const fromMasterById = masterEmployees.find(
      (row) => normalizeCode(row.id) === code || row.id.endsWith(code)
    );
    if (fromMasterById) return fromMasterById;
  }

  const fromMasterByName = findMasterEmployeeByName(masterEmployees, employeeName);
  if (fromMasterByName) return fromMasterByName;

  if (code) {
    return autoProvisioned.find((row) => normalizeCode(row.employeeCode) === code);
  }

  return undefined;
}

export type PendingAutoEmployee = {
  employeeCode: string;
  employeeName: string;
  department: string;
};

function safeString(value: unknown): string {
  try {
    if (value == null) return "";
    return String(value).trim();
  } catch {
    return "";
  }
}

export function detectPendingAutoEmployees(
  rows: Array<{ employeeCode?: string; employeeName?: string; department?: string }>,
  masterEmployees: EmployeeListItem[],
  autoProvisioned: AutoProvisionedEmployeeRecord[]
): PendingAutoEmployee[] {
  const pending = new Map<string, PendingAutoEmployee>();

  for (const row of rows) {
    const employeeName = safeString(row?.employeeName);
    const employeeCode =
      safeString(row?.employeeCode) ||
      (employeeName
        ? `AUTO-${employeeName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)}`
        : "TEMP_CODE");
    const department = safeString(row?.department);

    if (!employeeName && !employeeCode) continue;

    if (resolveImportEmployee(employeeCode, employeeName, masterEmployees, autoProvisioned)) {
      continue;
    }

    pending.set(normalizeCode(employeeCode), {
      employeeCode: normalizeCode(employeeCode),
      employeeName: employeeName || employeeCode,
      department,
    });
  }

  return Array.from(pending.values());
}
