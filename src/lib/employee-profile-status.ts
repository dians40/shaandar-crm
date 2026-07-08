import { isCompleteProfileSalaryBasis } from "@/constants/employee-options";
import type { EmployeeListItem } from "@/types/employee-list";

function isPresent(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  return Boolean(trimmed) && trimmed !== "—";
}

function resolveBasicSalary(employee: EmployeeListItem): number | null {
  return employee.basicSalary ?? employee.fixSalaryAmount;
}

function hasOvertimeAmount(employee: EmployeeListItem): boolean {
  return (
    employee.overtimeHourlyRate !== null &&
    employee.overtimeHourlyRate !== undefined &&
    Number.isFinite(employee.overtimeHourlyRate)
  );
}

/** All seven profile fields must pass for "Profile Updated". */
export function isEmployeeProfileComplete(employee: EmployeeListItem): boolean {
  const basicSalary = resolveBasicSalary(employee);

  return (
    isPresent(employee.name) &&
    isPresent(employee.machineAssignment) &&
    isPresent(employee.employeeType) &&
    isCompleteProfileSalaryBasis(employee.salaryBasis) &&
    basicSalary !== null &&
    basicSalary > 0 &&
    isPresent(employee.assignedFromGroup) &&
    hasOvertimeAmount(employee)
  );
}

export function getEmployeeProfileStatusLabel(employee: EmployeeListItem): string {
  return isEmployeeProfileComplete(employee) ? "Profile Updated" : "Profile Pending";
}
