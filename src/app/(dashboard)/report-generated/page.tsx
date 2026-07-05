import { DashboardShell } from "@/components/layout/dashboard-shell";
import ReportPanel from "@/components/master-panel/report-panel";

export default function ReportPage() {
  return (
    <DashboardShell
      title="Report"
      description="Universal stock, sales, labor, and vehicle logistics summary dashboard."
    >
      <ReportPanel />
    </DashboardShell>
  );
}
