import { DashboardShell } from "@/components/layout/dashboard-shell";
import MasterPanelEmployeeSubHeader from "@/components/master-panel/master-panel-employee-sub-header";
import MasterPanelView from "@/components/master-panel/master-panel-view";

export default function MasterPanelPage() {
  return (
    <DashboardShell
      title="Master Panel"
      description="Employee management and core master data configuration."
    >
      <MasterPanelEmployeeSubHeader />
      <MasterPanelView />
    </DashboardShell>
  );
}
