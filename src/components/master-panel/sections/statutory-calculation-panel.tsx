"use client";

import { ESI_RATES, PF_RATES } from "@/constants/statutory-rates";
import {
  calculateSalaryDeductions,
  calculateAllowances,
} from "@/lib/salary-breakdown";
import {
  calculateVariableSalary,
  getEffectiveGrossSalary,
  parseSalaryAmount,
} from "@/lib/statutory-calculations";
import type { BankAndSalary, SalaryBasis } from "@/types/employee-form";
import { VARIABLE_SALARY_BASIS } from "@/constants/statutory-rates";

type Props = {
  data: BankAndSalary;
  salaryBasis?: SalaryBasis | "";
};

export default function StatutoryCalculationPanel({ data, salaryBasis = "" }: Props) {
  const basicSalary = parseSalaryAmount(data.basicSalary || data.fixSalaryAmount);
  const allowances = calculateAllowances(basicSalary);
  const deductions = calculateSalaryDeductions(
    basicSalary,
    data.pfEnabled,
    data.esiEnabled
  );

  const variableGross = getEffectiveGrossSalary(
    data.fixSalaryAmount,
    data.variableSalaryEnabled,
    data.dailyRate,
    data.workedDays
  );

  const variablePreview = calculateVariableSalary(data.dailyRate, data.workedDays);
  const showVariableHint = VARIABLE_SALARY_BASIS.includes(
    salaryBasis as (typeof VARIABLE_SALARY_BASIS)[number]
  );

  const esiBase = Math.min(allowances.grossWithAllowances, ESI_RATES.wageCeilingMonthly);
  const pfEmployer = data.pfEnabled
    ? (basicSalary * (PF_RATES.employerEpfPercent + PF_RATES.employerAdminPercent)) / 100
    : 0;
  const esiEmployer = data.esiEnabled
    ? (esiBase * ESI_RATES.employerPercent) / 100
    : 0;

  return (
    <section className="space-y-4 rounded-xl border border-corporate-border bg-corporate-bg p-5">
      <div>
        <h3 className="text-sm font-semibold text-corporate-text">
          Statutory Benefits — Full Calculation Panel
        </h3>
        <p className="mt-1 text-xs text-corporate-muted">
          PF on Basic only · ESI on Basic + all allowances (Conveyance, HRA, Tea, Washing).
        </p>
      </div>

      {data.variableSalaryEnabled && showVariableHint && (
        <div className="rounded-lg border border-corporate-brand/20 bg-corporate-brand-light px-4 py-3 text-sm">
          <p className="font-medium text-corporate-brand">Variable Salary Logic</p>
          <p className="mt-1 text-corporate-text">
            Daily Rate ₹{data.dailyRate || "0"} × {data.workedDays || "0"} days ={" "}
            <span className="font-semibold">₹{variablePreview.toLocaleString("en-IN")}</span>
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-corporate-border bg-corporate-surface p-4">
          <p className="text-xs font-semibold uppercase text-corporate-muted">Basic Salary</p>
          <p className="mt-2 text-xl font-bold text-corporate-text">
            ₹{basicSalary.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-lg border border-corporate-border bg-corporate-surface p-4">
          <p className="text-xs font-semibold uppercase text-corporate-muted">
            Gross + Allowances
          </p>
          <p className="mt-2 text-xl font-bold text-corporate-text">
            ₹{allowances.grossWithAllowances.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-lg border border-corporate-border bg-corporate-surface p-4">
          <p className="text-xs font-semibold uppercase text-corporate-muted">
            Employee Deductions
          </p>
          <p className="mt-2 text-xl font-bold text-red-600">
            ₹{deductions.totalDeductions.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-lg border border-corporate-border bg-corporate-surface p-4">
          <p className="text-xs font-semibold uppercase text-corporate-muted">Net Salary</p>
          <p className="mt-2 text-xl font-bold text-emerald-600">
            ₹{deductions.netSalary.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {data.variableSalaryEnabled && variableGross > 0 && basicSalary === 0 && (
        <p className="text-xs text-corporate-muted">
          Variable gross for period: ₹{variableGross.toLocaleString("en-IN")} (statutory
          breakdown uses Basic + allowances when Basic Salary is set).
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-corporate-border bg-corporate-surface p-4">
          <h4 className="text-sm font-semibold text-corporate-text">{ESI_RATES.label}</h4>
          {!data.esiEnabled ? (
            <p className="mt-2 text-sm text-corporate-muted">ESI is disabled for this employee.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-corporate-muted">Calculation Base</dt>
                <dd className="font-medium">
                  ₹{allowances.grossWithAllowances.toLocaleString("en-IN")} (Basic + Allowances)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-corporate-muted">Government Rate (Employee)</dt>
                <dd className="font-medium">{ESI_RATES.employeePercent}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-corporate-muted">Government Rate (Employer)</dt>
                <dd className="font-medium">{ESI_RATES.employerPercent}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-corporate-muted">Wage Ceiling</dt>
                <dd className="font-medium">₹{ESI_RATES.wageCeilingMonthly.toLocaleString("en-IN")}</dd>
              </div>
              <div className="flex justify-between border-t border-corporate-border pt-2">
                <dt className="text-corporate-text">Employee Deduction</dt>
                <dd className="font-semibold text-corporate-text">
                  ₹{deductions.esiDeduction.toLocaleString("en-IN")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-corporate-text">Employer Contribution</dt>
                <dd className="font-semibold text-corporate-text">
                  ₹{Math.round(esiEmployer * 100) / 100}
                </dd>
              </div>
            </dl>
          )}
        </article>

        <article className="rounded-lg border border-corporate-border bg-corporate-surface p-4">
          <h4 className="text-sm font-semibold text-corporate-text">{PF_RATES.label}</h4>
          {!data.pfEnabled ? (
            <p className="mt-2 text-sm text-corporate-muted">PF is disabled for this employee.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-corporate-muted">Calculation Base</dt>
                <dd className="font-medium">
                  ₹{basicSalary.toLocaleString("en-IN")} (Basic only)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-corporate-muted">Government Rate (Employee)</dt>
                <dd className="font-medium">{PF_RATES.employeePercent}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-corporate-muted">Government Rate (Employer)</dt>
                <dd className="font-medium">
                  {PF_RATES.employerEpfPercent + PF_RATES.employerAdminPercent}%
                </dd>
              </div>
              <div className="flex justify-between border-t border-corporate-border pt-2">
                <dt className="text-corporate-text">Employee Deduction</dt>
                <dd className="font-semibold text-corporate-text">
                  ₹{deductions.pfDeduction.toLocaleString("en-IN")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-corporate-text">Employer Contribution</dt>
                <dd className="font-semibold text-corporate-text">
                  ₹{Math.round(pfEmployer * 100) / 100}
                </dd>
              </div>
            </dl>
          )}
        </article>
      </div>
    </section>
  );
}
