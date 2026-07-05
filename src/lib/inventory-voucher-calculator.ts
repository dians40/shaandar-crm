import type {
  InventoryVoucherFormState,
  TransactionItemLine,
  TransactionSundryLine,
} from "@/types/inventory-voucher";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateItemLineAmounts(
  quantity: number,
  rate: number,
  gstTaxPercentage: string
): Pick<TransactionItemLine, "lineSubtotal" | "lineTax" | "lineTotal"> {
  const qty = Math.max(0, quantity);
  const unitRate = Math.max(0, rate);
  const lineSubtotal = round2(qty * unitRate);
  const gstRate = Number(gstTaxPercentage) || 0;
  const lineTax = round2((lineSubtotal * gstRate) / 100);
  return {
    lineSubtotal,
    lineTax,
    lineTotal: round2(lineSubtotal + lineTax),
  };
}

export function recalculateItemLine(line: TransactionItemLine): TransactionItemLine {
  const amounts = calculateItemLineAmounts(
    line.quantity,
    line.rate,
    line.gstTaxPercentage
  );
  return { ...line, ...amounts };
}

export function calculateSundryAmount(
  line: TransactionSundryLine,
  itemsSubtotal: number
): number {
  if (line.calculationType === "percentage") {
    return round2((itemsSubtotal * Math.max(0, line.inputValue)) / 100);
  }
  return round2(Math.max(0, line.inputValue));
}

export function recalculateSundryLines(
  lines: TransactionSundryLine[],
  itemsSubtotal: number
): TransactionSundryLine[] {
  return lines.map((row) => ({
    ...row,
    computedAmount: calculateSundryAmount(row, itemsSubtotal),
  }));
}

export function computeVoucherTotals(form: InventoryVoucherFormState): {
  itemsSubtotal: number;
  itemsTaxTotal: number;
  sundriesNet: number;
  grandTotal: number;
  lines: TransactionItemLine[];
  sundryLines: TransactionSundryLine[];
} {
  const lines = form.lines.map(recalculateItemLine);
  const itemsSubtotal = round2(
    lines.reduce((sum, row) => sum + row.lineSubtotal, 0)
  );
  const itemsTaxTotal = round2(lines.reduce((sum, row) => sum + row.lineTax, 0));
  const sundryLines = recalculateSundryLines(form.sundryLines, itemsSubtotal);
  const sundriesNet = round2(
    sundryLines.reduce(
      (sum, row) =>
        sum + (row.natureType === "minus" ? -row.computedAmount : row.computedAmount),
      0
    )
  );
  const grandTotal = round2(itemsSubtotal + itemsTaxTotal + sundriesNet);

  return { itemsSubtotal, itemsTaxTotal, sundriesNet, grandTotal, lines, sundryLines };
}

export function validateInventoryVoucherForm(
  form: InventoryVoucherFormState,
  options: { isReturn: boolean; voucherLabel: string }
): string | null {
  if (!form.voucherNumber.trim()) return `${options.voucherLabel} number is required.`;
  if (!form.voucherDate.trim()) return "Date is required.";
  if (!form.partyAccountId) return "Party name is required.";
  const validLines = form.lines.filter((row) => row.itemId && row.quantity > 0);
  if (validLines.length === 0) return "Add at least one item line with quantity.";
  if (options.isReturn && !form.originalInvoiceRef.trim()) {
    return "Original invoice reference number is required for returns.";
  }
  return null;
}
