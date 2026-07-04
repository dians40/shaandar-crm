import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Boxes,
  Calculator,
  CalendarCheck,
  ClipboardList,
  Factory,
  FileText,
  Layers,
  Package,
  PackageCheck,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Timer,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

export type MasterPanelModuleId =
  | "employee-management"
  | "godowns-locations"
  | "overtime-tracker"
  | "sales-dispatch"
  | "sales-return"
  | "purchase-logs"
  | "purchase-return"
  | "orders-management"
  | "loading-dispatch"
  | "inventory-transfer"
  | "journal-entry"
  | "manufacturing-production"
  | "parts-order-followup"
  | "parts-order-verification"
  | "items-products"
  | "item-groups"
  | "unit-conversion"
  | "bom"
  | "expenses-receipts"
  | "attendance-system";

export type MasterPanelModule = {
  id: MasterPanelModuleId;
  serial: number;
  /** Compact label shown in the main sidebar only */
  navLabel: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  placeholderMessage: string;
};

/** Serialized ERP workflow — top to bottom execution order. */
export const MASTER_PANEL_MODULES: MasterPanelModule[] = [
  {
    id: "employee-management",
    serial: 1,
    navLabel: "Employee",
    title: "Employee",
    subtitle: "Labor records, search, bio-data, and forms",
    icon: Users,
    placeholderMessage: "",
  },
  {
    id: "godowns-locations",
    serial: 2,
    navLabel: "Godown",
    title: "Godowns / Locations Management",
    subtitle: "Which godown they work in",
    icon: Warehouse,
    placeholderMessage: "Godowns Management Coming Soon",
  },
  {
    id: "overtime-tracker",
    serial: 3,
    navLabel: "Overtime",
    title: "Overtime Tracker",
    subtitle: "Track extra hours and OT payouts",
    icon: Timer,
    placeholderMessage: "Overtime Tracker Coming Soon",
  },
  {
    id: "sales-dispatch",
    serial: 4,
    navLabel: "Sales",
    title: "Sales / Dispatch",
    subtitle: "Outbound sales and dispatch logs",
    icon: Truck,
    placeholderMessage: "Sales / Dispatch Coming Soon",
  },
  {
    id: "sales-return",
    serial: 5,
    navLabel: "Sales Return",
    title: "Sales Return",
    subtitle: "Customer return processing",
    icon: RotateCcw,
    placeholderMessage: "Sales Return Coming Soon",
  },
  {
    id: "purchase-logs",
    serial: 6,
    navLabel: "Purchase",
    title: "Purchase Logs",
    subtitle: "Vendor purchase records",
    icon: ShoppingCart,
    placeholderMessage: "Purchase Logs Coming Soon",
  },
  {
    id: "purchase-return",
    serial: 7,
    navLabel: "Purchase Return",
    title: "Purchase Return",
    subtitle: "Return goods to suppliers",
    icon: Package,
    placeholderMessage: "Purchase Return Coming Soon",
  },
  {
    id: "orders-management",
    serial: 8,
    navLabel: "Orders",
    title: "Orders Management",
    subtitle: "Party order retention",
    icon: ClipboardList,
    placeholderMessage: "Orders Management Coming Soon",
  },
  {
    id: "loading-dispatch",
    serial: 9,
    navLabel: "Loading",
    title: "Loading / Dispatch Details",
    subtitle: "Loading bay and dispatch detail",
    icon: PackageCheck,
    placeholderMessage: "Loading / Dispatch Details Coming Soon",
  },
  {
    id: "inventory-transfer",
    serial: 10,
    navLabel: "Transfer",
    title: "Inventory Transfer",
    subtitle: "Inter-godown stock movement",
    icon: ArrowLeftRight,
    placeholderMessage: "Inventory Transfer Coming Soon",
  },
  {
    id: "journal-entry",
    serial: 11,
    navLabel: "Journal",
    title: "Journal Entry",
    subtitle: "Core accounting entries",
    icon: FileText,
    placeholderMessage: "Journal Entry Coming Soon",
  },
  {
    id: "manufacturing-production",
    serial: 12,
    navLabel: "Production",
    title: "Manufacturing / Production Logs",
    subtitle: "Production run tracking",
    icon: Factory,
    placeholderMessage: "Manufacturing / Production Logs Coming Soon",
  },
  {
    id: "parts-order-followup",
    serial: 13,
    navLabel: "Parts Follow-up",
    title: "Parts Order Follow-up",
    subtitle: "Track pending parts orders",
    icon: Wrench,
    placeholderMessage: "Parts Order Follow-up Coming Soon",
  },
  {
    id: "parts-order-verification",
    serial: 14,
    navLabel: "Parts Order",
    title: "Parts Order",
    subtitle: "True item verification",
    icon: PackageCheck,
    placeholderMessage: "Parts Order Verification Coming Soon",
  },
  {
    id: "items-products",
    serial: 15,
    navLabel: "Items",
    title: "Items / Products Management",
    subtitle: "SKU and product master",
    icon: Boxes,
    placeholderMessage: "Items / Products Management Coming Soon",
  },
  {
    id: "item-groups",
    serial: 16,
    navLabel: "Groups",
    title: "Item Groups / Categories",
    subtitle: "Product grouping hierarchy",
    icon: Layers,
    placeholderMessage: "Item Groups / Categories Coming Soon",
  },
  {
    id: "unit-conversion",
    serial: 17,
    navLabel: "Units",
    title: "Unit Conversion Engine",
    subtitle: "UOM conversion rules",
    icon: Calculator,
    placeholderMessage: "Unit Conversion Engine Coming Soon",
  },
  {
    id: "bom",
    serial: 18,
    navLabel: "BOM",
    title: "BOM (Bill of Materials)",
    subtitle: "Material composition per product",
    icon: Layers,
    placeholderMessage: "BOM (Bill of Materials) Coming Soon",
  },
  {
    id: "expenses-receipts",
    serial: 19,
    navLabel: "Expenses",
    title: "Expenses & Receipts Tracker",
    subtitle: "Operational expense logging",
    icon: Receipt,
    placeholderMessage: "Expenses & Receipts Tracker Coming Soon",
  },
  {
    id: "attendance-system",
    serial: 20,
    navLabel: "Attendance",
    title: "Attendance System",
    subtitle: "Daily labor attendance",
    icon: CalendarCheck,
    placeholderMessage: "Attendance System Coming Soon",
  },
];

const MODULE_MAP = new Map(
  MASTER_PANEL_MODULES.map((module) => [module.id, module])
);

export function getMasterPanelModule(
  id: string | null | undefined
): MasterPanelModule | null {
  if (!id) return null;
  return MODULE_MAP.get(id as MasterPanelModuleId) ?? null;
}

export const DEFAULT_MASTER_PANEL_MODULE_ID: MasterPanelModuleId =
  "employee-management";

export type MasterPanelModuleGroup = {
  label: string;
  moduleIds: MasterPanelModuleId[];
};

/** Executive manager dropdown groups — avoids dumping 20 modules at once. */
export const MASTER_PANEL_MODULE_GROUPS: MasterPanelModuleGroup[] = [
  {
    label: "Workforce & HR",
    moduleIds: [
      "employee-management",
      "godowns-locations",
      "overtime-tracker",
      "attendance-system",
    ],
  },
  {
    label: "Sales & Dispatch",
    moduleIds: [
      "sales-dispatch",
      "sales-return",
      "orders-management",
      "loading-dispatch",
    ],
  },
  {
    label: "Purchase & Returns",
    moduleIds: ["purchase-logs", "purchase-return"],
  },
  {
    label: "Inventory & Items",
    moduleIds: [
      "inventory-transfer",
      "items-products",
      "item-groups",
      "unit-conversion",
      "bom",
    ],
  },
  {
    label: "Production & Parts",
    moduleIds: [
      "manufacturing-production",
      "parts-order-followup",
      "parts-order-verification",
    ],
  },
  {
    label: "Finance & Accounting",
    moduleIds: ["journal-entry", "expenses-receipts"],
  },
];
