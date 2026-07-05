import {
  LayoutDashboard,
  PanelTop,
  Users,
  ArrowLeftRight,
  Monitor,
  FileBarChart,
  LineChart,
  Database,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const sidebarNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Master Panel", href: "/master-panel", icon: PanelTop },
  { label: "User Management", href: "/user-management", icon: Users },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Display", href: "/display", icon: Monitor },
  { label: "Report", href: "/report-generated", icon: FileBarChart },
  { label: "Analyze API", href: "/api-refresh", icon: LineChart },
  { label: "Fresh Data Analyze", href: "/data-analysis", icon: Database },
];
