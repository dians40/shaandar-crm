import type { AttendanceWorkflowRecord } from "@/types/attendance-workflow";
import type { EmployeeListItem } from "@/types/employee-list";

function normalizeDepartment(value: string): string {
  return value.trim().toLowerCase();
}

export function filterEmployeesByDepartment(
  employees: EmployeeListItem[],
  departmentName: string,
  attendanceRecords: AttendanceWorkflowRecord[] = []
): EmployeeListItem[] {
  const target = normalizeDepartment(departmentName);
  if (!target) return employees;

  const attendanceEmployeeIds = new Set(
    attendanceRecords
      .filter((row) => normalizeDepartment(row.assignedMachine) === target)
      .map((row) => row.employeeId)
      .filter(Boolean)
  );

  return employees.filter((employee) => {
    if (normalizeDepartment(employee.machineAssignment) === target) return true;
    return attendanceEmployeeIds.has(employee.id);
  });
}

export function resolveEmployeeWage(employee: EmployeeListItem): number {
  if (employee.fixSalaryAmount != null && employee.fixSalaryAmount > 0) {
    return employee.fixSalaryAmount;
  }
  if (employee.dailyRate != null && employee.dailyRate > 0) {
    return employee.dailyRate;
  }
  if (employee.effectiveSalary != null && employee.effectiveSalary > 0) {
    return employee.effectiveSalary;
  }
  return 0;
}

/** Fixed overtime amount / rate configured on the employee master profile. */
export function resolveEmployeeOvertimeAmount(
  employee: Pick<EmployeeListItem, "overtimeHourlyRate"> | null | undefined
): number {
  const amount = employee?.overtimeHourlyRate;
  return amount != null && amount > 0 ? amount : 0;
}

export function parseFixedOvertimeAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
