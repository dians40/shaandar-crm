"use client";

import { Plus, Trash2 } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import {
  createEmptyLedgerLine,
  type LedgerPostingLine,
} from "@/types/accounting-voucher";
import { isLedgerLineFilled } from "@/lib/accounting-voucher-calculator";

type Props = {
  lines: LedgerPostingLine[];
  accounts: { value: string; label: string }[];
  onChange: (lines: LedgerPostingLine[]) => void;
};

function ensureTrailingLine(lines: LedgerPostingLine[]): LedgerPostingLine[] {
  if (lines.length === 0) return [createEmptyLedgerLine()];
  const last = lines[lines.length - 1];
  if (isLedgerLineFilled(last)) return [...lines, createEmptyLedgerLine()];
  return lines;
}

export default function LedgerPostingLinesGrid({ lines, accounts, onChange }: Props) {
  const accountMap = Object.fromEntries(accounts.map((row) => [row.value, row.label]));

  const updateLine = (index: number, patch: Partial<LedgerPostingLine>) => {
    const next = lines.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    onChange(ensureTrailingLine(next));
  };

  const handleAccountChange = (
    index: number,
    field: "accountDebitedId" | "accountCreditedId",
    accountId: string
  ) => {
    const nameField =
      field === "accountDebitedId" ? "accountDebitedName" : "accountCreditedName";
    updateLine(index, {
      [field]: accountId,
      [nameField]: accountMap[accountId] ?? "",
    });
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) {
      onChange([createEmptyLedgerLine()]);
      return;
    }
    onChange(lines.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-corporate-text">Ledger Posting Lines</h3>
        <button
          type="button"
          onClick={() => onChange([...lines, createEmptyLedgerLine()])}
          className="inline-flex items-center gap-1 rounded-full border border-corporate-border bg-white px-3 py-1.5 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>

      <div className="workspace-table-scroll rounded-xl border border-corporate-border">
        <table className="min-w-full text-sm">
          <thead className="bg-corporate-surface text-left text-xs uppercase tracking-wide text-corporate-muted">
            <tr>
              <th className="px-3 py-2">Account Debited</th>
              <th className="px-3 py-2">Account Credited</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Narration</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="border-t border-corporate-border align-top">
                <td className="min-w-[180px] px-3 py-2">
                  <SelectInput
                    label=""
                    value={line.accountDebitedId}
                    onChange={(event) =>
                      handleAccountChange(index, "accountDebitedId", event.target.value)
                    }
                    options={accounts}
                    placeholder="Select account"
                  />
                </td>
                <td className="min-w-[180px] px-3 py-2">
                  <SelectInput
                    label=""
                    value={line.accountCreditedId}
                    onChange={(event) =>
                      handleAccountChange(index, "accountCreditedId", event.target.value)
                    }
                    options={accounts}
                    placeholder="Select account"
                  />
                </td>
                <td className="min-w-[100px] px-3 py-2">
                  <TextInput
                    label=""
                    type="number"
                    min={0}
                    step="any"
                    value={line.amount || ""}
                    onChange={(event) =>
                      updateLine(index, { amount: Number(event.target.value) || 0 })
                    }
                  />
                </td>
                <td className="min-w-[200px] px-3 py-2">
                  <TextareaInput
                    label=""
                    rows={2}
                    value={line.narration}
                    onChange={(event) => updateLine(index, { narration: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="rounded-full p-1.5 text-red-600 hover:bg-red-50"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
