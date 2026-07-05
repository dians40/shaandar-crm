import type { MasterPanelModuleId } from "@/constants/master-panel-modules";
import type { InventoryVoucherKind } from "@/types/inventory-voucher";

export type InventoryVoucherPanelConfig = {
  moduleId: MasterPanelModuleId;
  kind: InventoryVoucherKind;
  moduleName: string;
  voucherLabel: string;
  partyLabel: string;
  isReturn: boolean;
  numberPrefix: string;
};

export const INVENTORY_VOUCHER_CONFIGS: Record<
  | "sales-dispatch"
  | "purchase-logs"
  | "sales-return"
  | "purchase-return-order",
  InventoryVoucherPanelConfig
> = {
  "sales-dispatch": {
    moduleId: "sales-dispatch",
    kind: "sales",
    moduleName: "Sales Invoice",
    voucherLabel: "Invoice",
    partyLabel: "Party Name",
    isReturn: false,
    numberPrefix: "SI",
  },
  "purchase-logs": {
    moduleId: "purchase-logs",
    kind: "purchase",
    moduleName: "Purchase Voucher",
    voucherLabel: "Voucher",
    partyLabel: "Vendor Name",
    isReturn: false,
    numberPrefix: "PV",
  },
  "sales-return": {
    moduleId: "sales-return",
    kind: "sales-return",
    moduleName: "Sales Return",
    voucherLabel: "Return",
    partyLabel: "Party Name",
    isReturn: true,
    numberPrefix: "SR",
  },
  "purchase-return-order": {
    moduleId: "purchase-return-order",
    kind: "purchase-return",
    moduleName: "Purchase Return",
    voucherLabel: "Return",
    partyLabel: "Vendor Name",
    isReturn: true,
    numberPrefix: "PR",
  },
};

export function getInventoryVoucherConfig(
  moduleId: MasterPanelModuleId
): InventoryVoucherPanelConfig | null {
  return (
    INVENTORY_VOUCHER_CONFIGS[moduleId as keyof typeof INVENTORY_VOUCHER_CONFIGS] ??
    null
  );
}
