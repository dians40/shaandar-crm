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
    title: "Employee Management",
    subtitle: "Add Employee / Assign Godown",
    icon: Users,
    placeholderMessage: "",
  },
  {
    id: "godowns-locations",
    serial: 2,
    title: "Godowns / Locations Management",
    subtitle: "Which godown they work in",
    icon: Warehouse,
    placeholderMessage: "Godowns Management Coming Soon",
  },
  {
    id: "overtime-tracker",
    serial: 3,
    title: "Overtime Tracker",
    subtitle: "Track extra hours and OT payouts",
    icon: Timer,
    placeholderMessage: "Overtime Tracker Coming Soon",
  },
  {
    id: "sales-dispatch",
    serial: 4,
    title: "Sales / Dispatch",
    subtitle: "Outbound sales and dispatch logs",
    icon: Truck,
    placeholderMessage: "Sales / Dispatch Coming Soon",
  },
  {
    id: "sales-return",
    serial: 5,
    title: "Sales Return",
    subtitle: "Customer return processing",
    icon: RotateCcw,
    placeholderMessage: "Sales Return Coming Soon",
  },
  {
    id: "purchase-logs",
    serial: 6,
    title: "Purchase Logs",
    subtitle: "Vendor purchase records",
    icon: ShoppingCart,
    placeholderMessage: "Purchase Logs Coming Soon",
  },
  {
    id: "purchase-return",
    serial: 7,
    title: "Purchase Return",
    subtitle: "Return goods to suppliers",
    icon: Package,
    placeholderMessage: "Purchase Return Coming Soon",
  },
  {
    id: "orders-management",
    serial: 8,
    title: "Orders Management",
    subtitle: "Party order retention",
    icon: ClipboardList,
    placeholderMessage: "Orders Management Coming Soon",
  },
  {
    id: "loading-dispatch",
    serial: 9,
    title: "Loading / Dispatch Details",
    subtitle: "Loading bay and dispatch detail",
    icon: PackageCheck,
    placeholderMessage: "Loading / Dispatch Details Coming Soon",
  },
  {
    id: "inventory-transfer",
    serial: 10,
    title: "Inventory Transfer",
    subtitle: "Inter-godown stock movement",
    icon: ArrowLeftRight,
    placeholderMessage: "Inventory Transfer Coming Soon",
  },
  {
    id: "journal-entry",
    serial: 11,
    title: "Journal Entry",
    subtitle: "Core accounting entries",
    icon: FileText,
    placeholderMessage: "Journal Entry Coming Soon",
  },
  {
    id: "manufacturing-production",
    serial: 12,
    title: "Manufacturing / Production Logs",
    subtitle: "Production run tracking",
    icon: Factory,
    placeholderMessage: "Manufacturing / Production Logs Coming Soon",
  },
  {
    id: "parts-order-followup",
    serial: 13,
    title: "Parts Order Follow-up",
    subtitle: "Track pending parts orders",
    icon: Wrench,
    placeholderMessage: "Parts Order Follow-up Coming Soon",
  },
  {
    id: "parts-order-verification",
    serial: 14,
    title: "Parts Order",
    subtitle: "True item verification",
    icon: PackageCheck,
    placeholderMessage: "Parts Order Verification Coming Soon",
  },
  {
    id: "items-products",
    serial: 15,
    title: "Items / Products Management",
    subtitle: "SKU and product master",
    icon: Boxes,
    placeholderMessage: "Items / Products Management Coming Soon",
  },
  {
    id: "item-groups",
    serial: 16,
    title: "Item Groups / Categories",
    subtitle: "Product grouping hierarchy",
    icon: Layers,
    placeholderMessage: "Item Groups / Categories Coming Soon",
  },
  {
    id: "unit-conversion",
    serial: 17,
    title: "Unit Conversion Engine",
    subtitle: "UOM conversion rules",
    icon: Calculator,
    placeholderMessage: "Unit Conversion Engine Coming Soon",
  },
  {
    id: "bom",
    serial: 18,
    title: "BOM (Bill of Materials)",
    subtitle: "Material composition per product",
    icon: Layers,
    placeholderMessage: "BOM (Bill of Materials) Coming Soon",
  },
  {
    id: "expenses-receipts",
    serial: 19,
    title: "Expenses & Receipts Tracker",
    subtitle: "Operational expense logging",
    icon: Receipt,
    placeholderMessage: "Expenses & Receipts Tracker Coming Soon",
  },
  {
    id: "attendance-system",
    serial: 20,
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
