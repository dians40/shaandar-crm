import type { ContractPacking, FamilyMember } from "@/types/employee-form";

export type AllowancesDb = {
  basicSalary?: number;
  conveyance?: number;
  hra?: number;
  tea?: number;
  washing?: number;
  grossWithAllowances?: number;
};

export type ContractPackingDb = Partial<
  ContractPacking & { totalEarned?: number }
>;

export type DocumentPaths = {
  profilePhoto?: string | null;
  aadhar?: string | null;
  pan?: string | null;
  esi?: string | null;
  pf?: string | null;
  drivingLicense?: string | null;
  rationCard?: string | null;
  voterId?: string | null;
  otherDocuments?: string | null;
};

export type EmployeeRow = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  father_name: string | null;
  mother_name: string | null;
  date_of_birth: string;
  age: number | null;
  joining_date: string | null;
  gender: string | null;
  mobile_number: string;
  alternative_mobile_number: string | null;
  full_address: string | null;
  pin_code: string | null;
  vehicle_number: string | null;
  police_station: string | null;
  reference_name: string | null;
  reference_mobile: string | null;
  photo_url: string | null;
  employee_type: string;
  salary_basis: string | null;
  assigned_firm: string | null;
  assigned_contractor: string | null;
  machine_assignment: string | null;
  family_members: FamilyMember[];
  document_paths: DocumentPaths;
  pan_number: string | null;
  pf_number: string | null;
  esi_number: string | null;
  voter_id_number: string | null;
  ration_card_number: string | null;
  driving_license_number: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  basic_salary: number | null;
  allowances: AllowancesDb;
  fix_salary_amount: number | null;
  variable_salary_enabled: boolean;
  daily_rate: number | null;
  worked_days: number | null;
  esi_enabled: boolean;
  pf_enabled: boolean;
  fooding_allowance: string | null;
  contract_packing: ContractPackingDb;
  bonus_last_year: number | null;
  extra_payment: number | null;
  advance_paid: number | null;
};

export type EmployeeInsert = Omit<
  EmployeeRow,
  "id" | "created_at" | "updated_at"
>;

export const EMPLOYEE_DOCUMENT_BUCKET = "employee-documents";

export const EMPLOYEE_LIST_COLUMNS = "*";

/** Fallback if migration 002/003 columns missing */
export const EMPLOYEE_LIST_COLUMNS_BASE =
  "id, full_name, employee_type, mobile_number, machine_assignment, created_at";

export const EMPLOYEE_FULL_COLUMNS = "*";
