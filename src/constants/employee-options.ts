import type {
  EmployeeType,
  EsIRole,
  SalaryBasis,
} from "@/types/employee-form";
export const EMPLOYEE_TYPES: EmployeeType[] = [
  "Contractor",
  "Regular",
  "Temporary",
];

export const SALARY_BASIS_BY_TYPE: Record<EmployeeType, SalaryBasis[]> = {
  Contractor: ["Contract-based", "Daily", "Weekly", "Monthly"],
  Regular: ["Branch Salary", "Monthly", "Weekly"],
  Temporary: ["Daily", "Weekly", "Monthly"],
};

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

export const FORM_SECTIONS = [
  { id: "basic" as const, label: "Basic Information", shortLabel: "Basic" },
  { id: "work" as const, label: "Work & Machine", shortLabel: "Work" },
  { id: "family" as const, label: "Family & ESI", shortLabel: "Family" },
  { id: "documents" as const, label: "Documents", shortLabel: "Docs" },
  { id: "bank" as const, label: "Bank & Salary", shortLabel: "Bank" },
];
