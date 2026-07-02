import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DataAnalysisPage() {
  return (
    <DashboardShell
      title="Data Analysis"
      description="Deep-dive analytics and data exploration tools."
    >
      <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-surface p-10 text-center shadow-card">
        <p className="text-sm font-medium text-corporate-text">Data Analysis</p>
        <p className="mt-2 text-sm text-corporate-muted">
          This module will be implemented in the next development phase.
        </p>
      </div>
    </DashboardShell>
  );
}
