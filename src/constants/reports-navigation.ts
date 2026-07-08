import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Clock3,
  PackageCheck,
  Printer,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

export type SalaryWagesReportId =
  | "salary"
  | "overtime"
  | "glass-packing"
  | "dining-packing"
  | "vacuum-forming"
  | "printing-glass";

export type ReportParentId = "salary";

export type ReportCategoryId = "salary-wages";

export type SalaryWagesReportDefinition = {
  id: SalaryWagesReportId;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type ReportCategoryDefinition = {
  id: ReportCategoryId;
  label: string;
  description: string;
  reports: SalaryWagesReportDefinition[];
};

export type ReportParentDefinition = {
  id: ReportParentId;
  label: string;
  description: string;
  categories: ReportCategoryDefinition[];
};

export const SALARY_WAGES_REPORTS: SalaryWagesReportDefinition[] = [
  {
    id: "salary",
    label: "Salary",
    description: "Employee master salary and wage profiles",
    icon: Banknote,
  },
  {
    id: "overtime",
    label: "Overtime",
    description: "Paid overtime submissions and day-by-day payouts",
    icon: Clock3,
  },
  {
    id: "glass-packing",
    label: "Glass Packing",
    description: "Glass packing labor and production records",
    icon: PackageCheck,
  },
  {
    id: "dining-packing",
    label: "Dining Packing",
    description: "Dining packing labor and production records",
    icon: UtensilsCrossed,
  },
  {
    id: "vacuum-forming",
    label: "Vacuum Forming",
    description: "Vacuum forming production and wage records",
    icon: Waves,
  },
  {
    id: "printing-glass",
    label: "Printing Glass",
    description: "Printing glass production and wage records",
    icon: Printer,
  },
];

export const REPORT_CATEGORIES: ReportCategoryDefinition[] = [
  {
    id: "salary-wages",
    label: "Salary and Wages",
    description: "Payroll, overtime, and production wage reports",
    reports: SALARY_WAGES_REPORTS,
  },
];

export const REPORT_PARENTS: ReportParentDefinition[] = [
  {
    id: "salary",
    label: "Salary",
    description: "Salary, payroll, and production wage reporting",
    categories: REPORT_CATEGORIES,
  },
];

export const DEFAULT_SALARY_WAGES_REPORT_ID: SalaryWagesReportId = "salary";

export function isSalaryWagesReportId(value: string | null): value is SalaryWagesReportId {
  return SALARY_WAGES_REPORTS.some((report) => report.id === value);
}

export function isReportCategoryId(value: string | null): value is ReportCategoryId {
  return REPORT_CATEGORIES.some((category) => category.id === value);
}

export function isReportParentId(value: string | null): value is ReportParentId {
  return REPORT_PARENTS.some((parent) => parent.id === value);
}

export function getSalaryWagesReport(id: string | null): SalaryWagesReportDefinition | undefined {
  return SALARY_WAGES_REPORTS.find((report) => report.id === id);
}

export function getReportCategory(id: string | null): ReportCategoryDefinition | undefined {
  return REPORT_CATEGORIES.find((category) => category.id === id);
}

export function getReportParent(id: string | null): ReportParentDefinition | undefined {
  return REPORT_PARENTS.find((parent) => parent.id === id);
}

export function buildReportHref(
  reportId: SalaryWagesReportId,
  categoryId: ReportCategoryId = "salary-wages"
): string {
  const params = new URLSearchParams({
    category: categoryId,
    report: reportId,
  });
  return `/report-generated?${params.toString()}`;
}
