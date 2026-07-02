import { DashboardShell } from "@/components/layout/dashboard-shell";
import MasterPanelView from "@/components/master-panel/master-panel-view";

export default function MasterPanelPage() {
  return (
    <DashboardShell
      title="Master Panel"
      description="Employee management and core master data configuration."
    >
      <MasterPanelView />
    </DashboardShell>
  );
}
