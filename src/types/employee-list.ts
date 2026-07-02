import type { EmployeeType } from "@/types/employee-form";

export type EmployeeListItem = {
  id: string;
  name: string;
  employeeType: EmployeeType;
  mobileNumber: string;
  vehicleNumber: string;
  machineAssignment: string;
  fixSalaryAmount: number | null;
  variableSalaryEnabled: boolean;
  dailyRate: number | null;
  workedDays: number | null;
  effectiveSalary: number | null;
};
