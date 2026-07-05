import type { BillOfSundryRecord } from "@/types/bill-of-sundry";
import { GST_TAX_OPTIONS } from "@/types/item";

export type InventoryVoucherKind =
  | "sales"
  | "purchase"
  | "sales-return"
  | "purchase-return";

export type TransactionItemLine = {
  id: string;
  itemId: string;
  itemName: string;
  unitSelection: string;
  unitLabel: string;
  unitConversionId: string;
  quantity: number;
  rate: number;
  gstTaxPercentage: string;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
};

export type TransactionSundryLine = {
  sundryId: string;
  sundryName: string;
  natureType: "plus" | "minus";
  calculationType: "percentage" | "absolute";
  inputValue: number;
  computedAmount: number;
};

export type InventoryVoucherRecord = {
  id: string;
  voucherKind: InventoryVoucherKind;
  voucherNumber: string;
  voucherDate: string;
  partyAccountId: string;
  partyName: string;
  destinationStation: string;
  vehicleId: string;
  vehicleRegistration: string;
  originalInvoiceRef: string;
  returnReason: string;
  lines: TransactionItemLine[];
  sundryLines: TransactionSundryLine[];
  itemsSubtotal: number;
  itemsTaxTotal: number;
  sundriesNet: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryVoucherFormState = Omit<
  InventoryVoucherRecord,
  | "id"
  | "itemsSubtotal"
  | "itemsTaxTotal"
  | "sundriesNet"
  | "grandTotal"
  | "createdAt"
  | "updatedAt"
>;

export const GST_DROPDOWN_OPTIONS = GST_TAX_OPTIONS.map((value) => ({
  value,
  label: `${value}% GST`,
}));

export function createEmptyItemLine(): TransactionItemLine {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    itemId: "",
    itemName: "",
    unitSelection: "",
    unitLabel: "",
    unitConversionId: "",
    quantity: 0,
    rate: 0,
    gstTaxPercentage: "18",
    lineSubtotal: 0,
    lineTax: 0,
    lineTotal: 0,
  };
}

export function buildDefaultSundryLines(
  sundries: BillOfSundryRecord[]
): TransactionSundryLine[] {
  return sundries.map((row) => ({
    sundryId: row.id,
    sundryName: row.sundryName,
    natureType: row.natureType,
    calculationType: row.calculationType,
    inputValue: 0,
    computedAmount: 0,
  }));
}

export function emptyInventoryVoucherForm(
  kind: InventoryVoucherKind,
  sundries: BillOfSundryRecord[]
): InventoryVoucherFormState {
  return {
    voucherKind: kind,
    voucherNumber: "",
    voucherDate: new Date().toISOString().slice(0, 10),
    partyAccountId: "",
    partyName: "",
    destinationStation: "",
    vehicleId: "",
    vehicleRegistration: "",
    originalInvoiceRef: "",
    returnReason: "",
    lines: [createEmptyItemLine()],
    sundryLines: buildDefaultSundryLines(sundries),
  };
}

function normalizeItemLine(line: Partial<TransactionItemLine>): TransactionItemLine {
  return {
    id: line.id ?? createEmptyItemLine().id,
    itemId: line.itemId ?? "",
    itemName: line.itemName ?? "",
    unitSelection: line.unitSelection ?? "",
    unitLabel: line.unitLabel ?? "",
    unitConversionId: line.unitConversionId ?? "",
    quantity: Number(line.quantity) || 0,
    rate: Number(line.rate) || 0,
    gstTaxPercentage: line.gstTaxPercentage ?? "18",
    lineSubtotal: Number(line.lineSubtotal) || 0,
    lineTax: Number(line.lineTax) || 0,
    lineTotal: Number(line.lineTotal) || 0,
  };
}

function normalizeSundryLine(line: Partial<TransactionSundryLine>): TransactionSundryLine {
  return {
    sundryId: line.sundryId ?? "",
    sundryName: line.sundryName ?? "",
    natureType: line.natureType === "minus" ? "minus" : "plus",
    calculationType: line.calculationType === "absolute" ? "absolute" : "percentage",
    inputValue: Number(line.inputValue) || 0,
    computedAmount: Number(line.computedAmount) || 0,
  };
}

export function normalizeInventoryVoucherRecord(
  row: Partial<InventoryVoucherRecord> & Pick<InventoryVoucherRecord, "id">
): InventoryVoucherRecord {
  const lines = Array.isArray(row.lines)
    ? row.lines.map(normalizeItemLine)
    : [createEmptyItemLine()];
  const sundryLines = Array.isArray(row.sundryLines)
    ? row.sundryLines.map(normalizeSundryLine)
    : [];

  return {
    id: row.id,
    voucherKind: row.voucherKind ?? "sales",
    voucherNumber: row.voucherNumber ?? "",
    voucherDate: row.voucherDate ?? new Date().toISOString().slice(0, 10),
    partyAccountId: row.partyAccountId ?? "",
    partyName: row.partyName ?? "",
    destinationStation: row.destinationStation ?? "",
    vehicleId: row.vehicleId ?? "",
    vehicleRegistration: row.vehicleRegistration ?? "",
    originalInvoiceRef: row.originalInvoiceRef ?? "",
    returnReason: row.returnReason ?? "",
    lines,
    sundryLines,
    itemsSubtotal: Number(row.itemsSubtotal) || 0,
    itemsTaxTotal: Number(row.itemsTaxTotal) || 0,
    sundriesNet: Number(row.sundriesNet) || 0,
    grandTotal: Number(row.grandTotal) || 0,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function recordToInventoryVoucherForm(
  record: InventoryVoucherRecord
): InventoryVoucherFormState {
  return {
    voucherKind: record.voucherKind,
    voucherNumber: record.voucherNumber,
    voucherDate: record.voucherDate,
    partyAccountId: record.partyAccountId,
    partyName: record.partyName,
    destinationStation: record.destinationStation,
    vehicleId: record.vehicleId,
    vehicleRegistration: record.vehicleRegistration,
    originalInvoiceRef: record.originalInvoiceRef,
    returnReason: record.returnReason,
    lines: record.lines.length > 0 ? record.lines : [createEmptyItemLine()],
    sundryLines: record.sundryLines,
  };
}
