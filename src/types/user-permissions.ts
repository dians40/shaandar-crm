export const USER_ROLES = [
  "Super Admin",
  "Manager",
  "Accountant",
  "Cashier",
  "Supervisor",
  "Operator",
] as const;

export type UserRoleName = (typeof USER_ROLES)[number];

export const PERMISSION_MODULES = [
  { id: "masters", label: "Masters", description: "Administration and master data" },
  { id: "sales", label: "Sales", description: "Sales invoices and returns" },
  { id: "purchase", label: "Purchase", description: "Purchase vouchers and returns" },
  { id: "expenses", label: "Expenses", description: "Expenses, receipts, and journals" },
  { id: "vehicle-trips", label: "Vehicle Trips", description: "Vehicle transaction logs" },
  { id: "parts-orders", label: "Parts Orders", description: "Parts order workflow" },
  { id: "maintenance-alerts", label: "Maintenance Alerts", description: "Preventive maintenance" },
  { id: "orders", label: "Order Module", description: "Party order retention and tracking" },
  { id: "loading", label: "Loading Module", description: "Loading bay and dispatch detail" },
  { id: "transfer", label: "Transfer Module", description: "Inter-godown stock movement" },
  { id: "manufacturing", label: "Manufacturing Module", description: "Production run tracking" },
  { id: "overtime", label: "Overtime Module", description: "Overtime tracker and payouts" },
  { id: "attendance", label: "Attendance Module", description: "Daily labor attendance" },
] as const;

export type PermissionModuleId = (typeof PERMISSION_MODULES)[number]["id"];

export const PERMISSION_KEYS = ["view", "create", "edit", "delete"] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view: "View",
  create: "Create / Entry",
  edit: "Edit",
  delete: "Delete",
};

export type RolePermissionMatrix = Record<
  UserRoleName,
  Record<PermissionModuleId, Record<PermissionKey, boolean>>
>;

export const PERMISSIONS_STORAGE_KEY = "shaandar-crm-role-permissions";
export const ACTIVE_ROLE_STORAGE_KEY = "shaandar-crm-active-preview-role";
