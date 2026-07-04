import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookOpen,
  Boxes,
  Calculator,
  CalendarCheck,
  Car,
  ClipboardList,
  Factory,
  FileText,
  FolderTree,
  Layers,
  Landmark,
  Package,
  PackageCheck,
  Receipt,
  RotateCcw,
  Ruler,
  ScrollText,
  ShoppingCart,
  Timer,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";

export type MasterPanelModuleId =
  | "accounts"
  | "account-group"
  | "items-products"
  | "item-groups"
  | "godowns-locations"
  | "unit-conversion"
  | "units"
  | "bill-of-sundries"
  | "bom"
  | "employee-management"
  | "employee-group"
  | "salary-component"
  | "vehicles-management-master"
  | "sales-dispatch"
  | "sales-return"
  | "purchase-logs"
  | "purchase-return-order"
  | "orders-management"
  | "loading-dispatch"
  | "inventory-transfer"
  | "journal-entry"
  | "manufacturing-production"
  | "parts-order"
  | "expenses"
  | "receipt"
  | "attendance-system"
  | "overtime-tracker"
  | "vehicle-management-transaction";

export type MasterPanelModule = {
  id: MasterPanelModuleId;
  serial: number;
  navLabel: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  placeholderMessage: string;
};

export type MasterPanelModuleGroupId = "administration" | "transaction";

export type MasterPanelModuleGroup = {
  id: MasterPanelModuleGroupId;
  label: string;
  description: string;
  moduleIds: MasterPanelModuleId[];
};

const ADMINISTRATION_MODULES: MasterPanelModule[] = [
  {
    id: "accounts",
    serial: 1,
    navLabel: "Accounts",
    title: "Accounts",
    subtitle: "Chart of accounts and ledger masters",
    icon: Landmark,
    placeholderMessage: "",
  },
  {
    id: "account-group",
    serial: 2,
    navLabel: "Account Group",
    title: "Account Group",
    subtitle: "Group hierarchy for accounting heads",
    icon: FolderTree,
    placeholderMessage: "",
  },
  {
    id: "items-products",
    serial: 3,
    navLabel: "Items",
    title: "Items / Products Management",
    subtitle: "SKU and product master",
    icon: Boxes,
    placeholderMessage: "",
  },
  {
    id: "item-groups",
    serial: 4,
    navLabel: "Item Groups",
    title: "Item Groups / Categories",
    subtitle: "Product grouping hierarchy",
    icon: Layers,
    placeholderMessage: "",
  },
  {
    id: "godowns-locations",
    serial: 5,
    navLabel: "Godown",
    title: "Material Center / Godown",
    subtitle: "Godown locations with add, edit, and remove",
    icon: Warehouse,
    placeholderMessage: "",
  },
  {
    id: "unit-conversion",
    serial: 6,
    navLabel: "Unit Conversion",
    title: "Unit Conversion Engine",
    subtitle: "UOM conversion rules between units",
    icon: Calculator,
    placeholderMessage: "",
  },
  {
    id: "units",
    serial: 7,
    navLabel: "Units",
    title: "Units",
    subtitle: "Base unit of measure definitions",
    icon: Ruler,
    placeholderMessage: "",
  },
  {
    id: "bill-of-sundries",
    serial: 8,
    navLabel: "Bill of Sundries",
    title: "Bill of Sundries",
    subtitle: "Sundry item billing configuration",
    icon: ScrollText,
    placeholderMessage: "Bill of Sundries coming soon",
  },
  {
    id: "bom",
    serial: 9,
    navLabel: "BOM",
    title: "BOM / Productions",
    subtitle: "Bill of materials and production structure",
    icon: Layers,
    placeholderMessage: "BOM (Bill of Materials) Coming Soon",
  },
  {
    id: "employee-management",
    serial: 10,
    navLabel: "Employee",
    title: "Employee",
    subtitle: "Labor records, search, bio-data, and forms",
    icon: Users,
    placeholderMessage: "",
  },
  {
    id: "employee-group",
    serial: 11,
    navLabel: "Employee Group",
    title: "Employee Group",
    subtitle: "Labor categories and group assignments",
    icon: UsersRound,
    placeholderMessage: "Employee group master coming soon",
  },
  {
    id: "salary-component",
    serial: 12,
    navLabel: "Salary Component",
    title: "Salary Component",
    subtitle: "Pay structure and salary head definitions",
    icon: Wallet,
    placeholderMessage: "Salary component master coming soon",
  },
  {
    id: "vehicles-management-master",
    serial: 13,
    navLabel: "Vehicles Master",
    title: "Vehicles Management Master",
    subtitle: "Fleet and vehicle registry",
    icon: Car,
    placeholderMessage: "Vehicles management master coming soon",
  },
];

const TRANSACTION_MODULES: MasterPanelModule[] = [
  {
    id: "sales-dispatch",
    serial: 14,
    navLabel: "Sales",
    title: "Sales / Dispatch",
    subtitle: "Outbound sales and dispatch logs",
    icon: Truck,
    placeholderMessage: "Sales / Dispatch Coming Soon",
  },
  {
    id: "sales-return",
    serial: 15,
    navLabel: "Sales Return",
    title: "Sales Return",
    subtitle: "Customer return processing",
    icon: RotateCcw,
    placeholderMessage: "Sales Return Coming Soon",
  },
  {
    id: "purchase-logs",
    serial: 16,
    navLabel: "Purchase",
    title: "Purchase",
    subtitle: "Vendor purchase records",
    icon: ShoppingCart,
    placeholderMessage: "Purchase Coming Soon",
  },
  {
    id: "purchase-return-order",
    serial: 17,
    navLabel: "Purchase Return",
    title: "Purchase Return Order",
    subtitle: "Return goods to suppliers",
    icon: Package,
    placeholderMessage: "Purchase Return Order Coming Soon",
  },
  {
    id: "orders-management",
    serial: 18,
    navLabel: "Orders",
    title: "Orders Management",
    subtitle: "Party order retention and tracking",
    icon: ClipboardList,
    placeholderMessage: "Orders Management Coming Soon",
  },
  {
    id: "loading-dispatch",
    serial: 19,
    navLabel: "Loading",
    title: "Loading / Dispatch Details",
    subtitle: "Loading bay and dispatch detail",
    icon: PackageCheck,
    placeholderMessage: "Loading / Dispatch Details Coming Soon",
  },
  {
    id: "inventory-transfer",
    serial: 20,
    navLabel: "Transfer",
    title: "Inventory Transfer",
    subtitle: "Inter-godown stock movement",
    icon: ArrowLeftRight,
    placeholderMessage: "Inventory Transfer Coming Soon",
  },
  {
    id: "journal-entry",
    serial: 21,
    navLabel: "Journal",
    title: "Journal Entry",
    subtitle: "Core accounting entries",
    icon: FileText,
    placeholderMessage: "Journal Entry Coming Soon",
  },
  {
    id: "manufacturing-production",
    serial: 22,
    navLabel: "Manufacturing",
    title: "Manufacturing / Production Logs",
    subtitle: "Production run tracking",
    icon: Factory,
    placeholderMessage: "Manufacturing / Production Logs Coming Soon",
  },
  {
    id: "parts-order",
    serial: 23,
    navLabel: "Parts Order",
    title: "Parts Order",
    subtitle: "Parts ordering and verification",
    icon: Wrench,
    placeholderMessage: "Parts Order Coming Soon",
  },
  {
    id: "expenses",
    serial: 24,
    navLabel: "Expenses",
    title: "Expenses",
    subtitle: "Operational expense logging",
    icon: Receipt,
    placeholderMessage: "Expenses tracker coming soon",
  },
  {
    id: "receipt",
    serial: 25,
    navLabel: "Receipt",
    title: "Receipt",
    subtitle: "Payment receipts and collections",
    icon: BookOpen,
    placeholderMessage: "Receipt tracker coming soon",
  },
  {
    id: "attendance-system",
    serial: 26,
    navLabel: "Attendance",
    title: "Attendance System",
    subtitle: "Daily labor attendance",
    icon: CalendarCheck,
    placeholderMessage: "Attendance System Coming Soon",
  },
  {
    id: "overtime-tracker",
    serial: 27,
    navLabel: "Overtime",
    title: "Overtime Tracker",
    subtitle: "Track extra hours, manager assignments, and OT payouts",
    icon: Timer,
    placeholderMessage: "",
  },
  {
    id: "vehicle-management-transaction",
    serial: 28,
    navLabel: "Vehicle Txn",
    title: "Vehicle Management Transaction",
    subtitle: "Daily vehicle usage and trip logs",
    icon: Car,
    placeholderMessage: "Vehicle management transaction coming soon",
  },
];

/** Full serialized ERP module list — Administration first, then Transaction. */
export const MASTER_PANEL_MODULES: MasterPanelModule[] = [
  ...ADMINISTRATION_MODULES,
  ...TRANSACTION_MODULES,
];

const MODULE_MAP = new Map(
  MASTER_PANEL_MODULES.map((entry) => [entry.id, entry])
);

export function getMasterPanelModule(
  id: string | null | undefined
): MasterPanelModule | null {
  if (!id) return null;
  return MODULE_MAP.get(id as MasterPanelModuleId) ?? null;
}

export const DEFAULT_MASTER_PANEL_MODULE_ID: MasterPanelModuleId =
  "employee-management";

/** Exactly two executive groups — Administration and Transaction. */
export const MASTER_PANEL_MODULE_GROUPS: MasterPanelModuleGroup[] = [
  {
    id: "administration",
    label: "Administration",
    description: "Masters & Settings",
    moduleIds: ADMINISTRATION_MODULES.map((entry) => entry.id),
  },
  {
    id: "transaction",
    label: "Transaction",
    description: "Daily Operations",
    moduleIds: TRANSACTION_MODULES.map((entry) => entry.id),
  },
];

export function getGroupForModule(
  moduleId: MasterPanelModuleId | null | undefined
): MasterPanelModuleGroup | null {
  if (!moduleId) return MASTER_PANEL_MODULE_GROUPS[0] ?? null;
  return (
    MASTER_PANEL_MODULE_GROUPS.find((group) =>
      group.moduleIds.includes(moduleId)
    ) ?? MASTER_PANEL_MODULE_GROUPS[0] ?? null
  );
}

export function getGroupById(
  groupId: MasterPanelModuleGroupId | null | undefined
): MasterPanelModuleGroup | null {
  if (!groupId) return MASTER_PANEL_MODULE_GROUPS[0] ?? null;
  return (
    MASTER_PANEL_MODULE_GROUPS.find((group) => group.id === groupId) ??
    MASTER_PANEL_MODULE_GROUPS[0] ??
    null
  );
}
