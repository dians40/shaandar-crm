import type { EmployeeListItem } from "@/types/employee-list";

const AUTO_PROVISION_STORAGE_KEY = "shaandar-crm-auto-provisioned-employees";

export type AutoProvisionedEmployeeRecord = EmployeeListItem & {
  employeeCode: string;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Imported", lastName: "Staff" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Staff" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
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
  employeeName: string
): AutoProvisionedEmployeeRecord {
  const code = normalizeCode(employeeCode);
  const { firstName, lastName } = splitName(employeeName);
  const id = `auto-emp-${code.replace(/[^A-Z0-9]/g, "")}-${Date.now()}`;

  return {
    id,
    employeeCode: code,
    name: employeeName.trim(),
    firstName,
    lastName,
    employeeType: "Direct Roll / Employee",
    mobileNumber: "",
    machineAssignment: "",
    fixSalaryAmount: null,
    variableSalaryEnabled: false,
    dailyRate: null,
    workedDays: null,
    effectiveSalary: null,
    assignedFromGroup: "Excel Auto-Import",
    esiStatus: "Non-Active",
    pfStatus: "Non-Active",
    hasAttendanceRecords: false,
    overtimeHourlyRate: null,
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
};

export function detectPendingAutoEmployees(
  rows: Array<{ employeeCode: string; employeeName: string }>,
  masterEmployees: EmployeeListItem[],
  autoProvisioned: AutoProvisionedEmployeeRecord[]
): PendingAutoEmployee[] {
  const pending = new Map<string, PendingAutoEmployee>();

  for (const row of rows) {
    const employeeName = row.employeeName.trim();
    const employeeCode =
      row.employeeCode.trim() ||
      (employeeName
        ? `AUTO-${employeeName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)}`
        : "");

    if (!employeeName && !employeeCode) continue;

    if (resolveImportEmployee(employeeCode, employeeName, masterEmployees, autoProvisioned)) {
      continue;
    }

    pending.set(normalizeCode(employeeCode), {
      employeeCode: normalizeCode(employeeCode),
      employeeName: employeeName || employeeCode,
    });
  }

  return Array.from(pending.values());
}
