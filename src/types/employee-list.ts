import type { EmployeeType, StatutoryStatus } from "@/types/employee-form";

export type EmployeeListItem = {
  id: string;
  name: string;
  employeeType: EmployeeType;
  mobileNumber: string;
  machineAssignment: string;
  fixSalaryAmount: number | null;
  variableSalaryEnabled: boolean;
  dailyRate: number | null;
  workedDays: number | null;
  effectiveSalary: number | null;
  assignedFromGroup: string;
  esiStatus: StatutoryStatus;
  pfStatus: StatutoryStatus;
  hasAttendanceRecords: boolean;
  overtimeHourlyRate: number | null;
};
