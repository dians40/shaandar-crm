import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ReportGeneratedPage() {
  return (
    <DashboardShell
      title="Report Generated"
      description="Access and download generated reports."
    >
      <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-surface p-10 text-center shadow-card">
        <p className="text-sm font-medium text-corporate-text">Report Generated</p>
        <p className="mt-2 text-sm text-corporate-muted">
          This module will be implemented in the next development phase.
        </p>
      </div>
    </DashboardShell>
  );
}
