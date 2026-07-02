"use client";

import {
  SelectInput,
  TextInput,
  ToggleInput,
} from "@/components/forms/form-fields";
import {
  FOODING_ALLOWANCE_OPTIONS,
  MINIMUM_OUTPUT_OPTIONS,
  PACKING_ITEM_OPTIONS,
} from "@/constants/employee-options";
import { VARIABLE_SALARY_BASIS } from "@/constants/statutory-rates";
import {
  calculateAllowances,
  calculateContractTotal,
} from "@/lib/salary-breakdown";
import type { BankAndSalary, ContractPacking, FoodingAllowance, SalaryBasis } from "@/types/employee-form";
import StatutoryCalculationPanel from "./statutory-calculation-panel";

type Props = {
  data: BankAndSalary;
  salaryBasis?: SalaryBasis | "";
  onChange: (data: BankAndSalary) => void;
};

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BankSalarySection({ data, salaryBasis = "", onChange }: Props) {
  const updateField = <K extends keyof BankAndSalary>(
    key: K,
    value: BankAndSalary[K]
  ) => {
    onChange({ ...data, [key]: value });
  };

  const updateContractField = <K extends keyof ContractPacking>(
    key: K,
    value: ContractPacking[K]
  ) => {
    onChange({
      ...data,
      contractPacking: { ...data.contractPacking, [key]: value },
    });
  };

  const handleBasicSalaryChange = (value: string) => {
    onChange({
      ...data,
      basicSalary: value,
      fixSalaryAmount: value,
    });
  };

  const showVariableFields =
    data.variableSalaryEnabled ||
    VARIABLE_SALARY_BASIS.includes(salaryBasis as (typeof VARIABLE_SALARY_BASIS)[number]);

  const basicAmount = Number(data.basicSalary) || 0;
  const allowances = calculateAllowances(basicAmount);
  const contractTotal = calculateContractTotal(
    data.contractPacking.quantityProduced,
    data.contractPacking.ratePerPiece
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-corporate-text">
          Bank, Salary & Allowances
        </h2>
        <p className="mt-1 text-sm text-corporate-muted">
          Basic salary auto-calculates allowances. PF applies on Basic only; ESI on total
          with allowances.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Salary Configuration
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="Basic Salary (₹)"
            name="basicSalary"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter basic salary"
            value={data.basicSalary}
            onChange={(e) => handleBasicSalaryChange(e.target.value)}
            hint="Allowances auto-calculate from this amount"
          />
          <div className="sm:col-span-2">
            <ToggleInput
              label="Variable Salary Option"
              description="Enable for Daily / Contract-based employees — salary = daily rate × worked days"
              checked={data.variableSalaryEnabled}
              onChange={(checked) => updateField("variableSalaryEnabled", checked)}
            />
          </div>
          {showVariableFields && (
            <>
              <TextInput
                label="Daily Rate (₹)"
                name="dailyRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="Rate per day"
                value={data.dailyRate}
                onChange={(e) => updateField("dailyRate", e.target.value)}
              />
              <TextInput
                label="Worked Days"
                name="workedDays"
                type="number"
                min="0"
                step="0.5"
                placeholder="Days worked in period"
                value={data.workedDays}
                onChange={(e) => updateField("workedDays", e.target.value)}
              />
            </>
          )}
        </div>
      </section>

      {basicAmount > 0 && (
        <section className="space-y-4 rounded-xl border border-corporate-brand/20 bg-corporate-brand-light/30 p-5">
          <h3 className="text-sm font-semibold text-corporate-text">
            Automated Salary Breakdown
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <BreakdownRow label="Basic Salary" value={formatCurrency(allowances.basicSalary)} />
            <BreakdownRow
              label="Conveyance Allowance (20%)"
              value={formatCurrency(allowances.conveyance)}
            />
            <BreakdownRow
              label="House Rent Allowance — HRA (40%)"
              value={formatCurrency(allowances.hra)}
            />
            <BreakdownRow
              label="Tea Allowance (20%)"
              value={formatCurrency(allowances.tea)}
            />
            <BreakdownRow
              label="Washing Allowance (20%)"
              value={formatCurrency(allowances.washing)}
            />
            <BreakdownRow
              label="Gross (Basic + Allowances)"
              value={formatCurrency(allowances.grossWithAllowances)}
              highlight
            />
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
        <div>
          <h3 className="text-sm font-semibold text-corporate-text">
            Column 6 — Per Packing / Contract Salary
          </h3>
          <p className="mt-1 text-xs text-corporate-muted">
            Contract-based output tracking with item, minimum output, quantity, and rate.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SelectInput
            label="Item Name"
            name="contractItemName"
            value={data.contractPacking.itemName}
            onChange={(e) => updateContractField("itemName", e.target.value)}
            placeholder="Select item"
            options={PACKING_ITEM_OPTIONS.map((item) => ({
              value: item,
              label: item,
            }))}
          />
          <SelectInput
            label="Minimum Output"
            name="contractMinimumOutput"
            value={data.contractPacking.minimumOutput}
            onChange={(e) => updateContractField("minimumOutput", e.target.value)}
            placeholder="Required quantity"
            options={MINIMUM_OUTPUT_OPTIONS.map((qty) => ({
              value: qty,
              label: `${qty} units`,
            }))}
          />
          <TextInput
            label="Quantity Produced"
            name="contractQuantityProduced"
            type="number"
            min="0"
            step="1"
            placeholder="Actual quantity"
            value={data.contractPacking.quantityProduced}
            onChange={(e) => updateContractField("quantityProduced", e.target.value)}
          />
          <TextInput
            label="Rate Per Cartoon / Piece (₹)"
            name="contractRatePerPiece"
            type="number"
            min="0"
            step="0.01"
            placeholder="Rate per unit"
            value={data.contractPacking.ratePerPiece}
            onChange={(e) => updateContractField("ratePerPiece", e.target.value)}
          />
          <div className="flex flex-col justify-end rounded-lg border border-corporate-border bg-corporate-surface p-4">
            <p className="text-xs font-semibold uppercase text-corporate-muted">
              Total Earned Amount
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {formatCurrency(contractTotal)}
            </p>
            <p className="mt-0.5 text-xs text-corporate-muted">
              Quantity × Rate (auto-calculated)
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Bank Details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="Bank Account Number"
            name="bankAccountNumber"
            placeholder="Enter account number"
            value={data.bankAccountNumber}
            onChange={(e) => updateField("bankAccountNumber", e.target.value)}
          />
          <TextInput
            label="IFSC Code"
            name="ifscCode"
            placeholder="e.g. SBIN0001234"
            value={data.ifscCode}
            onChange={(e) => updateField("ifscCode", e.target.value.toUpperCase())}
          />
          <TextInput
            label="Branch Name"
            name="branchName"
            placeholder="Bank branch name"
            value={data.branchName}
            onChange={(e) => updateField("branchName", e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Statutory Benefits
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleInput
            label="ESI Enable"
            description="ESI deduction on Basic + all allowances"
            checked={data.esiEnabled}
            onChange={(checked) => updateField("esiEnabled", checked)}
          />
          <ToggleInput
            label="PF Enable"
            description="PF deduction on Basic salary only"
            checked={data.pfEnabled}
            onChange={(checked) => updateField("pfEnabled", checked)}
          />
        </div>
        <StatutoryCalculationPanel data={data} salaryBasis={salaryBasis} />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Fooding Option
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectInput
            label="Fooding Allowance"
            name="foodingAllowance"
            value={data.foodingAllowance}
            onChange={(e) =>
              updateField("foodingAllowance", e.target.value as FoodingAllowance | "")
            }
            options={FOODING_ALLOWANCE_OPTIONS.map((option) => ({
              value: option,
              label: option,
            }))}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Financial Tracker
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="Bonus Last Year"
            name="bonusLastYear"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount in ₹"
            value={data.bonusLastYear}
            onChange={(e) => updateField("bonusLastYear", e.target.value)}
          />
          <TextInput
            label="Extra Payment"
            name="extraPayment"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount in ₹"
            value={data.extraPayment}
            onChange={(e) => updateField("extraPayment", e.target.value)}
          />
          <TextInput
            label="Advance Paid"
            name="advancePaid"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount in ₹"
            value={data.advancePaid}
            onChange={(e) => updateField("advancePaid", e.target.value)}
          />
        </div>
      </section>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        highlight
          ? "border-corporate-brand bg-corporate-brand-light"
          : "border-corporate-border bg-corporate-surface"
      }`}
    >
      <p className="text-xs text-corporate-muted">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          highlight ? "text-corporate-brand" : "text-corporate-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
