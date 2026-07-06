import type { MasterPanelModuleId } from "@/constants/master-panel-modules";

/** Transaction modules with full panel implementations (not placeholders). */
export const IMPLEMENTED_TRANSACTION_MODULE_IDS = new Set<MasterPanelModuleId>([
  "attendance-system",
  "overtime-tracker",
  "vehicle-management-transaction",
  "sales-dispatch",
  "sales-return",
  "purchase-logs",
  "purchase-return-order",
  "manufacturing-production",
  "expenses",
  "receipt",
  "journal-entry",
  "inventory-transfer",
  "parts-order",
]);

export type TransactionListColumnLabels = {
  primaryLabel: string;
  secondaryLabel: string;
};

/** Primary row identifier labels per transaction module for uniform list headers. */
export const TRANSACTION_LIST_COLUMN_LABELS: Partial<
  Record<MasterPanelModuleId, TransactionListColumnLabels>
> = {
  "sales-dispatch": { primaryLabel: "Party Name", secondaryLabel: "Voucher #" },
  "sales-return": { primaryLabel: "Party Name", secondaryLabel: "Return #" },
  "purchase-logs": { primaryLabel: "Vendor Name", secondaryLabel: "Voucher #" },
  "purchase-return-order": { primaryLabel: "Vendor Name", secondaryLabel: "Return #" },
  "orders-management": { primaryLabel: "Party Name", secondaryLabel: "Order #" },
  "loading-dispatch": { primaryLabel: "Party Name", secondaryLabel: "Dispatch #" },
  "inventory-transfer": { primaryLabel: "From / To", secondaryLabel: "Transfer #" },
  "journal-entry": { primaryLabel: "Account Name", secondaryLabel: "Entry #" },
  "manufacturing-production": { primaryLabel: "Product Name", secondaryLabel: "Batch #" },
  "parts-order": { primaryLabel: "Vendor Name", secondaryLabel: "Order #" },
  expenses: { primaryLabel: "Payee Name", secondaryLabel: "Voucher #" },
  receipt: { primaryLabel: "Party Name", secondaryLabel: "Receipt #" },
  "attendance-system": { primaryLabel: "Employee Name", secondaryLabel: "Date" },
  "attendance-manual-entry": { primaryLabel: "Employee Name", secondaryLabel: "Date" },
  "overtime-tracker": { primaryLabel: "Employee Name", secondaryLabel: "Work Date" },
  "vehicle-management-transaction": {
    primaryLabel: "Vehicle Number",
    secondaryLabel: "Trip Date",
  },
};

export function getTransactionListColumnLabels(
  moduleId: MasterPanelModuleId
): TransactionListColumnLabels {
  return (
    TRANSACTION_LIST_COLUMN_LABELS[moduleId] ?? {
      primaryLabel: "Name",
      secondaryLabel: "Reference",
    }
  );
}
