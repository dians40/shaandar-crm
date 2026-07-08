import type { EmployeeInsert } from "@/types/employee-db";
import type { EmployeeListItem } from "@/types/employee-list";

/** Baseline profile values injected when Excel import auto-provisions an employee. */
export const EXCEL_IMPORT_EMPLOYEE_DEFAULTS = {
  dateOfBirth: "1980-01-01",
  mobileNumber: "00000",
  gender: "Male" as const,
  assignedFromGroup: "Mehak Industries",
  employeeType: "Regular",
  salaryBasis: "Monthly",
  basicSalary: 500,
  overtimeHourlyRate: 500,
};

export function resolveExcelImportDepartment(excelDepartment?: string | null): string {
  return String(excelDepartment ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildExcelImportEmployeeDbInsert(input: {
  employeeName: string;
  department?: string | null;
}): EmployeeInsert {
  const department = resolveExcelImportDepartment(input.department);
  const employeeName = String(input.employeeName ?? "")
    .trim()
    .replace(/\s+/g, " ");

  return {
    full_name: employeeName || "Imported Employee",
    father_name: null,
    mother_name: null,
    date_of_birth: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.dateOfBirth,
    age: null,
    joining_date: null,
    gender: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.gender,
    mobile_number: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.mobileNumber,
    alternative_mobile_number: null,
    full_address: null,
    pin_code: null,
    vehicle_number: null,
    police_station: null,
    reference_name: null,
    reference_mobile: null,
    photo_url: null,
    employee_type: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.employeeType,
    salary_basis: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.salaryBasis,
    assigned_from_group: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.assignedFromGroup,
    machine_assignment: department || null,
    family_members: [],
    document_paths: {},
    pan_number: null,
    pf_number: null,
    esi_number: null,
    voter_id_number: null,
    ration_card_number: null,
    driving_license_number: null,
    bank_account_number: null,
    ifsc_code: null,
    branch_name: null,
    basic_salary: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.basicSalary,
    allowances: {},
    fix_salary_amount: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.basicSalary,
    variable_salary_enabled: false,
    daily_rate: null,
    worked_days: null,
    esi_status: "Non-Active",
    pf_status: "Non-Active",
    assigned_firm_group: null,
    pf_active_firm: null,
    fooding_allowance: null,
    contract_packing: {},
    bonus_last_year: null,
    extra_payment: null,
    advance_paid: null,
    overtime_hourly_rate: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.overtimeHourlyRate,
  };
}

export function mapBulkRowsToImportEmployeeRows(
  bulkRows: Array<{ payCode?: string; employeeName?: string; department?: string }>
): Array<{ employeeCode: string; employeeName: string; department: string }> {
  return bulkRows.map((row) => ({
    employeeCode: String(row.payCode ?? "").trim(),
    employeeName: String(row.employeeName ?? "").trim(),
    department: resolveExcelImportDepartment(row.department),
  }));
}

export function buildExcelImportEmployeeListItem(
  id: string,
  employeeName: string,
  department?: string | null
): Pick<
  EmployeeListItem,
  | "name"
  | "employeeType"
  | "mobileNumber"
  | "machineAssignment"
  | "basicSalary"
  | "fixSalaryAmount"
  | "variableSalaryEnabled"
  | "dailyRate"
  | "workedDays"
  | "effectiveSalary"
  | "assignedFromGroup"
  | "esiStatus"
  | "pfStatus"
  | "salaryBasis"
  | "overtimeHourlyRate"
> {
  const departmentValue = resolveExcelImportDepartment(department);

  return {
    name: employeeName.trim() || "Imported Employee",
    employeeType: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.employeeType,
    mobileNumber: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.mobileNumber,
    machineAssignment: departmentValue || "—",
    basicSalary: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.basicSalary,
    fixSalaryAmount: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.basicSalary,
    variableSalaryEnabled: false,
    dailyRate: null,
    workedDays: null,
    effectiveSalary: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.basicSalary,
    assignedFromGroup: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.assignedFromGroup,
    esiStatus: "Non-Active",
    pfStatus: "Non-Active",
    salaryBasis: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.salaryBasis,
    overtimeHourlyRate: EXCEL_IMPORT_EMPLOYEE_DEFAULTS.overtimeHourlyRate,
  };
}
