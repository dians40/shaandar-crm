import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CalendarCheck,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { MasterPanelModuleId } from "@/constants/master-panel-modules";

export type TransactionNavItem = {
  id: string;
  label: string;
  labelHi: string;
  moduleId: MasterPanelModuleId;
  icon: LucideIcon;
  /** When set, navigates to master panel (e.g. Employee Management). */
  href?: string;
};

export const TRANSACTIONS_NAV_ITEMS: TransactionNavItem[] = [
  {
    id: "sales-entry",
    label: "Sales Entry",
    labelHi: "बिक्री एंट्री",
    moduleId: "sales-dispatch",
    icon: ShoppingCart,
  },
  {
    id: "purchase-entry",
    label: "Purchase Entry",
    labelHi: "खरीद एंट्री",
    moduleId: "purchase-logs",
    icon: Wallet,
  },
  {
    id: "material-inward",
    label: "Material Inward / Receipt",
    labelHi: "माल आवक",
    moduleId: "receipt",
    icon: ArrowDownToLine,
  },
  {
    id: "material-outward",
    label: "Material Outward / Issue",
    labelHi: "माल जावक",
    moduleId: "sales-dispatch",
    icon: ArrowUpFromLine,
  },
  {
    id: "stock-transfer",
    label: "Stock Transfer Log",
    labelHi: "स्टॉक ट्रांसफर",
    moduleId: "inventory-transfer",
    icon: ArrowLeftRight,
  },
  {
    id: "loading-gate-pass",
    label: "Loading & Gate Pass",
    labelHi: "लोडिंग एंट्री",
    moduleId: "loading-dispatch",
    icon: Truck,
  },
  {
    id: "attendance-manual-entry",
    label: "Attendance Manual Entry",
    labelHi: "हाजिरी मैनुअल एंट्री",
    moduleId: "attendance-manual-entry",
    icon: CalendarCheck,
  },
  {
    id: "employee-management",
    label: "Employee Management",
    labelHi: "कर्मचारी",
    moduleId: "employee-management",
    href: "/master-panel?module=employee-management",
    icon: Users,
  },
];

export function getTransactionNavHref(item: TransactionNavItem): string {
  return item.href ?? `/transactions?module=${item.moduleId}`;
}

export function isTransactionNavItemActive(
  item: TransactionNavItem,
  pathname: string,
  activeModuleId: string | null
): boolean {
  if (item.href) {
    return pathname.startsWith("/master-panel") && activeModuleId === item.moduleId;
  }
  return pathname.startsWith("/transactions") && activeModuleId === item.moduleId;
}
