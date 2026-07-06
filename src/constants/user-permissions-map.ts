import type { MasterPanelModuleId } from "@/constants/master-panel-modules";
import type { PermissionModuleId } from "@/types/user-permissions";

const MASTER_PANEL_PERMISSION_MAP: Partial<Record<MasterPanelModuleId, PermissionModuleId>> = {
  accounts: "masters",
  "account-group": "masters",
  "items-products": "masters",
  "item-groups": "masters",
  "godowns-locations": "masters",
  "unit-conversion": "masters",
  units: "masters",
  "bill-of-sundries": "masters",
  bom: "masters",
  "employee-management": "masters",
  "employee-group": "masters",
  "salary-component": "masters",
  "vehicles-management-master": "masters",
  "general-settings": "masters",
  "api-integration-gateway": "masters",
  "sales-dispatch": "sales",
  "sales-return": "sales",
  "purchase-logs": "purchase",
  "purchase-return-order": "purchase",
  "orders-management": "orders",
  "loading-dispatch": "loading",
  "inventory-transfer": "transfer",
  "manufacturing-production": "manufacturing",
  expenses: "expenses",
  receipt: "expenses",
  "journal-entry": "expenses",
  "attendance-system": "attendance",
  "attendance-manual-entry": "attendance",
  "overtime-tracker": "overtime",
  "vehicle-management-transaction": "vehicle-trips",
  "parts-order": "parts-orders",
  "repair-maintenance": "maintenance-alerts",
};

export function getPermissionModuleForMasterPanel(
  moduleId: MasterPanelModuleId
): PermissionModuleId {
  return MASTER_PANEL_PERMISSION_MAP[moduleId] ?? "masters";
}
