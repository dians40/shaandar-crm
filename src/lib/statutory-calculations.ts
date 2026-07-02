import { ESI_RATES, PF_RATES } from "@/constants/statutory-rates";

export type StatutoryBreakdown = {
  grossBase: number;
  esi: {
    enabled: boolean;
    employeeContribution: number;
    employerContribution: number;
    employeeRate: string;
    employerRate: string;
    wageCeiling: number;
  };
  pf: {
    enabled: boolean;
    employeeContribution: number;
    employerContribution: number;
    employeeRate: string;
    employerRate: string;
  };
  totalEmployeeDeduction: number;
  totalEmployerContribution: number;
};

export function parseSalaryAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateVariableSalary(
  dailyRate: string | number | null | undefined,
  workedDays: string | number | null | undefined
): number {
  const rate = parseSalaryAmount(dailyRate);
  const days = parseSalaryAmount(workedDays);
  return rate * days;
}

export function getEffectiveGrossSalary(
  fixSalary: string | number | null | undefined,
  variableEnabled: boolean,
  dailyRate: string | number | null | undefined,
  workedDays: string | number | null | undefined
): number {
  if (variableEnabled) {
    const variable = calculateVariableSalary(dailyRate, workedDays);
    return variable > 0 ? variable : parseSalaryAmount(fixSalary);
  }
  return parseSalaryAmount(fixSalary);
}

export function calculateStatutoryBreakdown(
  grossSalary: number,
  esiEnabled: boolean,
  pfEnabled: boolean
): StatutoryBreakdown {
  const esiBase = Math.min(grossSalary, ESI_RATES.wageCeilingMonthly);

  const esiEmployee = esiEnabled
    ? (esiBase * ESI_RATES.employeePercent) / 100
    : 0;
  const esiEmployer = esiEnabled
    ? (esiBase * ESI_RATES.employerPercent) / 100
    : 0;

  const pfEmployee = pfEnabled ? (grossSalary * PF_RATES.employeePercent) / 100 : 0;
  const pfEmployer = pfEnabled
    ? (grossSalary * (PF_RATES.employerEpfPercent + PF_RATES.employerAdminPercent)) / 100
    : 0;

  return {
    grossBase: grossSalary,
    esi: {
      enabled: esiEnabled,
      employeeContribution: round2(esiEmployee),
      employerContribution: round2(esiEmployer),
      employeeRate: `${ESI_RATES.employeePercent}%`,
      employerRate: `${ESI_RATES.employerPercent}%`,
      wageCeiling: ESI_RATES.wageCeilingMonthly,
    },
    pf: {
      enabled: pfEnabled,
      employeeContribution: round2(pfEmployee),
      employerContribution: round2(pfEmployer),
      employeeRate: `${PF_RATES.employeePercent}%`,
      employerRate: `${PF_RATES.employerEpfPercent + PF_RATES.employerAdminPercent}%`,
    },
    totalEmployeeDeduction: round2(esiEmployee + pfEmployee),
    totalEmployerContribution: round2(esiEmployer + pfEmployer),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
