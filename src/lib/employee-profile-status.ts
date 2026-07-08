import type { EmployeeListItem } from "@/types/employee-list";

function isBlank(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  return !trimmed || trimmed === "—";
}

function hasSalaryConfigured(employee: EmployeeListItem): boolean {
  if (employee.variableSalaryEnabled) {
    return employee.dailyRate !== null && employee.dailyRate > 0;
  }
  return employee.fixSalaryAmount !== null && employee.fixSalaryAmount > 0;
}

export function isEmployeeProfileComplete(employee: EmployeeListItem): boolean {
  return (
    !isBlank(employee.name) &&
    !isBlank(employee.employeeType) &&
    !isBlank(employee.machineAssignment) &&
    !isBlank(employee.mobileNumber) &&
    !isBlank(employee.assignedFromGroup) &&
    employee.salaryBasis.trim() === "Daily" &&
    hasSalaryConfigured(employee)
  );
}

export function getEmployeeProfileStatusLabel(employee: EmployeeListItem): string {
  return isEmployeeProfileComplete(employee) ? "Profile Updated" : "Profile Pending";
}
