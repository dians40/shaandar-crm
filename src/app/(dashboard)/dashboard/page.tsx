import { DashboardShell } from "@/components/layout/dashboard-shell";
import DashboardPanel from "@/components/master-panel/dashboard-panel";

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard"
      description="Executive command center for live labor, fleet, inventory, and transaction control."
    >
      <DashboardPanel />
    </DashboardShell>
  );
}
