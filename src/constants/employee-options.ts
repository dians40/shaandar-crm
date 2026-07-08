import type { EsIRole, SalaryBasis } from "@/types/employee-form";

export const LEGACY_EMPLOYEE_TYPES = ["Contractor", "Regular", "Temporary"] as const;

export type LegacyEmployeeType = (typeof LEGACY_EMPLOYEE_TYPES)[number];

export const EMPLOYEE_FORM_SALARY_BASIS_OPTIONS: SalaryBasis[] = [
  "Monthly",
  "Weekly",
  "Daily",
  "Contractor",
];

export const SALARY_BASIS_BY_TYPE: Record<LegacyEmployeeType, SalaryBasis[]> = {
  Contractor: EMPLOYEE_FORM_SALARY_BASIS_OPTIONS,
  Regular: EMPLOYEE_FORM_SALARY_BASIS_OPTIONS,
  Temporary: EMPLOYEE_FORM_SALARY_BASIS_OPTIONS,
};

export const DEFAULT_SALARY_BASIS_OPTIONS: SalaryBasis[] =
  EMPLOYEE_FORM_SALARY_BASIS_OPTIONS;

/** Legacy DB value mapped to the form label "Contractor". */
export const LEGACY_SALARY_BASIS_ALIASES: Partial<Record<string, SalaryBasis>> = {
  "Contract-based": "Contractor",
};

export function normalizeSalaryBasis(
  value: string | null | undefined
): SalaryBasis | "" {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return LEGACY_SALARY_BASIS_ALIASES[trimmed] ?? (trimmed as SalaryBasis);
}

export function isCompleteProfileSalaryBasis(
  value: string | null | undefined
): boolean {
  const normalized = normalizeSalaryBasis(value);
  return (
    normalized !== "" &&
    EMPLOYEE_FORM_SALARY_BASIS_OPTIONS.includes(normalized)
  );
}

export function getSalaryBasisOptionsForEmployeeType(
  employeeType: string
): SalaryBasis[] {
  if (employeeType in SALARY_BASIS_BY_TYPE) {
    return SALARY_BASIS_BY_TYPE[employeeType as LegacyEmployeeType];
  }
  return DEFAULT_SALARY_BASIS_OPTIONS;
}

export const MACHINE_OPTIONS = [
  "Machine A",
  "Machine B",
  "Machine C",
  "None",
] as const;

export const ESI_ROLE_OPTIONS: EsIRole[] = [
  "Primary Beneficiary",
  "Dependent Spouse",
  "Dependent Child",
  "Dependent Parent",
  "ESI Nominee",
  "Not Applicable",
];

export const FOODING_ALLOWANCE_OPTIONS = [
  "Daily Food Provided by Company",
  "Self-Managed / Eaten by Self",
] as const;

export const PACKING_ITEM_OPTIONS = [
  "Item A",
  "Item B",
  "Item C",
  "Item D",
] as const;

export const MINIMUM_OUTPUT_OPTIONS = [
  "50",
  "100",
  "150",
  "200",
  "250",
  "300",
  "500",
] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

export const ASSIGNED_FIRM_OPTIONS = [
  "Krishna Food Product",
  "MAHEK Industries",
] as const;

export type AssignedFirm = (typeof ASSIGNED_FIRM_OPTIONS)[number];

export const FIRM_HEAD_PROFILE_OPTIONS = [
  "Krishna Food Product",
  "Mehak Industries",
  "KFP Abhay Mishra",
  "KFP Dipankar Kalita",
  "KFP Lalit Lakhotia",
  "KFP Hazir Ali",
  "MI Hazir Ali",
  "MI Lalit Lakhotia",
  "MI Dipankar Kalita",
  "MI Abhay Kumar Mishra",
] as const;

export type FirmHeadProfile = (typeof FIRM_HEAD_PROFILE_OPTIONS)[number];

export const PF_FIRM_OPTIONS = [
  "Krishna Food Products",
  "Mehak Industries",
] as const;

export type PfFirm = (typeof PF_FIRM_OPTIONS)[number];

export const FORM_SECTIONS = [
  { id: "basic" as const, label: "Basic Information", shortLabel: "Basic" },
  { id: "work" as const, label: "Work & Machine", shortLabel: "Work" },
  { id: "family" as const, label: "Family & ESI", shortLabel: "Family" },
  { id: "documents" as const, label: "Documents", shortLabel: "Docs" },
  { id: "bank" as const, label: "Bank & Salary", shortLabel: "Bank" },
];
