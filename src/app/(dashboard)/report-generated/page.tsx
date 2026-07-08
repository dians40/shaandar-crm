import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import ReportPanel from "@/components/master-panel/report-panel";

function ReportPanelFallback() {
  return (
    <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
      Loading reports workspace...
    </div>
  );
}

export default function ReportPage() {
  return (
    <DashboardShell
      title="Reports"
      description="Salary and wages reports with date-filtered transaction grids."
    >
      <Suspense fallback={<ReportPanelFallback />}>
        <ReportPanel />
      </Suspense>
    </DashboardShell>
  );
}
