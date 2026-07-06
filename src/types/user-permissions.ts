export const BUILTIN_USER_ROLES = [
  "Super Admin",
  "Manager",
  "Accountant",
  "Cashier",
  "Supervisor",
  "Operator",
] as const;

/** @deprecated Use roles from useUserPermissions(). Kept for default seeding. */
export const USER_ROLES = BUILTIN_USER_ROLES;

export type UserRoleName = string;

export const ROLES_LIST_STORAGE_KEY = "shaandar-crm-user-roles-list";

export const PROTECTED_USER_ROLES = ["Super Admin"] as const;

export function isProtectedRole(role: string): boolean {
  return (PROTECTED_USER_ROLES as readonly string[]).includes(role);
}

export function getDefaultRolesList(): string[] {
  return [...BUILTIN_USER_ROLES];
}

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
  string,
  Record<PermissionModuleId, Record<PermissionKey, boolean>>
>;

export const PERMISSIONS_STORAGE_KEY = "shaandar-crm-role-permissions";
export const ACTIVE_ROLE_STORAGE_KEY = "shaandar-crm-active-preview-role";
