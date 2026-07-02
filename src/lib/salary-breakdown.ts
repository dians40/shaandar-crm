import { ESI_RATES, PF_RATES } from "@/constants/statutory-rates";

export type AllowanceBreakdown = {
  basicSalary: number;
  conveyance: number;
  hra: number;
  tea: number;
  washing: number;
  grossWithAllowances: number;
};

export type DeductionBreakdown = {
  pfDeduction: number;
  esiDeduction: number;
  totalDeductions: number;
  netSalary: number;
};

export function calculateAllowances(basicSalary: number): AllowanceBreakdown {
  const basic = Math.max(0, basicSalary);
  const conveyance = round2(basic * 0.2);
  const hra = round2(basic * 0.4);
  const tea = round2(basic * 0.2);
  const washing = round2(basic * 0.2);

  return {
    basicSalary: basic,
    conveyance,
    hra,
    tea,
    washing,
    grossWithAllowances: round2(basic + conveyance + hra + tea + washing),
  };
}

export function calculateSalaryDeductions(
  basicSalary: number,
  pfEnabled: boolean,
  esiEnabled: boolean
): DeductionBreakdown & { allowances: AllowanceBreakdown } {
  const allowances = calculateAllowances(basicSalary);
  const pfDeduction = pfEnabled
    ? round2((allowances.basicSalary * PF_RATES.employeePercent) / 100)
    : 0;
  const esiDeduction = esiEnabled
    ? round2((allowances.grossWithAllowances * ESI_RATES.employeePercent) / 100)
    : 0;
  const totalDeductions = round2(pfDeduction + esiDeduction);

  return {
    allowances,
    pfDeduction,
    esiDeduction,
    totalDeductions,
    netSalary: round2(allowances.grossWithAllowances - totalDeductions),
  };
}

export function calculateContractTotal(
  quantity: string | number,
  rate: string | number
): number {
  const q = typeof quantity === "number" ? quantity : Number(quantity);
  const r = typeof rate === "number" ? rate : Number(rate);
  if (!Number.isFinite(q) || !Number.isFinite(r)) return 0;
  return round2(q * r);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
