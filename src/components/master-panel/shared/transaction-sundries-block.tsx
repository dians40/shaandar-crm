"use client";

import { TextInput } from "@/components/forms/form-fields";
import { recalculateSundryLines } from "@/lib/inventory-voucher-calculator";
import type { TransactionSundryLine } from "@/types/inventory-voucher";

type Props = {
  lines: TransactionSundryLine[];
  itemsSubtotal: number;
  onChange: (lines: TransactionSundryLine[]) => void;
};

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionSundriesBlock({
  lines,
  itemsSubtotal,
  onChange,
}: Props) {
  const computedLines = recalculateSundryLines(lines, itemsSubtotal);

  const updateLine = (index: number, inputValue: number) => {
    onChange(
      lines.map((row, idx) => (idx === index ? { ...row, inputValue } : row))
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-corporate-border bg-corporate-surface/40 p-4">
      <h3 className="text-sm font-semibold text-corporate-text">Bill of Sundries</h3>
      <div className="grid gap-2">
        {computedLines.map((row, index) => (
          <div
            key={row.sundryId}
            className="grid gap-2 rounded-lg border border-corporate-border bg-white p-3 sm:grid-cols-[1fr_120px_140px]"
          >
            <div>
              <p className="text-sm font-medium text-corporate-text">{row.sundryName}</p>
              <p className="text-xs text-corporate-muted">
                {row.natureType === "minus" ? "Minus" : "Plus"} ·{" "}
                {row.calculationType === "percentage" ? "Percentage" : "Absolute"}
              </p>
            </div>
            <TextInput
              label={row.calculationType === "percentage" ? "% Value" : "Amount"}
              type="number"
              min={0}
              step="any"
              value={row.inputValue || ""}
              onChange={(event) => updateLine(index, Number(event.target.value) || 0)}
            />
            <div className="flex flex-col justify-end text-right">
              <span className="text-xs text-corporate-muted">Computed</span>
              <span
                className={`text-sm font-semibold ${
                  row.natureType === "minus" ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {row.natureType === "minus" ? "−" : "+"}
                {formatCurrency(row.computedAmount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
