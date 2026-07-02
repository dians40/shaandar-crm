import {
  LayoutDashboard,
  PanelTop,
  Users,
  ArrowLeftRight,
  Monitor,
  FileBarChart,
  LineChart,
  RefreshCw,
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
  { label: "Report Generated", href: "/report-generated", icon: FileBarChart },
  { label: "Analysis", href: "/analysis", icon: LineChart },
  { label: "API Refresh", href: "/api-refresh", icon: RefreshCw },
  { label: "Data Analysis", href: "/data-analysis", icon: Database },
];
