"use client";

import { Plus, Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { recalculateItemLine } from "@/lib/inventory-voucher-calculator";
import {
  buildUnitOptionsForItem,
  defaultRateForVoucherKind,
  ensureTrailingItemLine,
  resolveUnitSelection,
} from "@/lib/inventory-voucher-units";
import {
  createEmptyItemLine,
  GST_DROPDOWN_OPTIONS,
  type InventoryVoucherKind,
  type TransactionItemLine,
} from "@/types/inventory-voucher";
import type { ItemRecord } from "@/types/item";
import type { UnitConversionRecord } from "@/types/unit-conversion";

type Props = {
  lines: TransactionItemLine[];
  voucherKind: InventoryVoucherKind;
  items: ItemRecord[];
  conversions: UnitConversionRecord[];
  unitNameById: Record<string, string>;
  onChange: (lines: TransactionItemLine[]) => void;
};

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionItemLinesGrid({
  lines,
  voucherKind,
  items,
  conversions,
  unitNameById,
  onChange,
}: Props) {
  const itemMap = Object.fromEntries(items.map((row) => [row.id, row]));

  const updateLine = (index: number, patch: Partial<TransactionItemLine>) => {
    const next = lines.map((row, idx) => {
      if (idx !== index) return row;
      return recalculateItemLine({ ...row, ...patch });
    });
    onChange(ensureTrailingItemLine(next, createEmptyItemLine));
  };

  const handleItemChange = (index: number, itemId: string) => {
    const item = itemMap[itemId];
    const unitOptions = buildUnitOptionsForItem(item, conversions, unitNameById);
    const defaultUnit = unitOptions[0];
    const unitSelection = defaultUnit?.value ?? "";
    const { unitLabel, unitConversionId } = resolveUnitSelection(unitSelection, unitOptions);

    updateLine(index, {
      itemId,
      itemName: item?.itemName ?? "",
      unitSelection,
      unitLabel,
      unitConversionId,
      rate: item ? defaultRateForVoucherKind(item, voucherKind) : 0,
      gstTaxPercentage: item?.gstTaxPercentage ?? "18",
    });
  };

  const handleUnitChange = (index: number, unitSelection: string) => {
    const line = lines[index];
    const item = itemMap[line.itemId];
    const unitOptions = buildUnitOptionsForItem(item, conversions, unitNameById);
    const { unitLabel, unitConversionId } = resolveUnitSelection(unitSelection, unitOptions);
    updateLine(index, { unitSelection, unitLabel, unitConversionId });
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) {
      onChange([createEmptyItemLine()]);
      return;
    }
    onChange(lines.filter((_, idx) => idx !== index));
  };

  const addLine = () => {
    onChange([...lines, createEmptyItemLine()]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-corporate-text">Item Lines</h3>
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-1 rounded-full border border-corporate-border bg-white px-3 py-1.5 text-xs font-semibold text-corporate-text hover:border-corporate-brand/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-corporate-border">
        <table className="min-w-full text-sm">
          <thead className="bg-corporate-surface text-left text-xs uppercase tracking-wide text-corporate-muted">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Rate</th>
              <th className="px-3 py-2">GST</th>
              <th className="px-3 py-2 text-right">Line Total</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const item = itemMap[line.itemId];
              const unitOptions = buildUnitOptionsForItem(item, conversions, unitNameById).map(
                (row) => ({ value: row.value, label: row.label })
              );
              const computed = recalculateItemLine(line);

              return (
                <tr key={line.id} className="border-t border-corporate-border align-top">
                  <td className="min-w-[180px] px-3 py-2">
                    <SelectInput
                      label=""
                      value={line.itemId}
                      onChange={(event) => handleItemChange(index, event.target.value)}
                      options={items.map((row) => ({ value: row.id, label: row.itemName }))}
                      placeholder="Select item"
                    />
                  </td>
                  <td className="min-w-[220px] px-3 py-2">
                    <SelectInput
                      label=""
                      value={line.unitSelection}
                      onChange={(event) => handleUnitChange(index, event.target.value)}
                      options={unitOptions}
                      placeholder="Select unit"
                      disabled={!line.itemId}
                    />
                  </td>
                  <td className="min-w-[90px] px-3 py-2">
                    <TextInput
                      label=""
                      type="number"
                      min={0}
                      step="any"
                      value={line.quantity || ""}
                      onChange={(event) =>
                        updateLine(index, { quantity: Number(event.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="min-w-[90px] px-3 py-2">
                    <TextInput
                      label=""
                      type="number"
                      min={0}
                      step="any"
                      value={line.rate || ""}
                      onChange={(event) =>
                        updateLine(index, { rate: Number(event.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="min-w-[110px] px-3 py-2">
                    <SelectInput
                      label=""
                      value={line.gstTaxPercentage}
                      onChange={(event) =>
                        updateLine(index, { gstTaxPercentage: event.target.value })
                      }
                      options={GST_DROPDOWN_OPTIONS}
                      placeholder="GST"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-corporate-text">
                    {formatCurrency(computed.lineTotal)}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
