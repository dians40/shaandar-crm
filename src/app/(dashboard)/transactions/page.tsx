import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function TransactionsPage() {
  return (
    <DashboardShell
      title="Transactions"
      description="View and manage all business transactions."
    >
      <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-surface p-10 text-center shadow-card">
        <p className="text-sm font-medium text-corporate-text">Transactions</p>
        <p className="mt-2 text-sm text-corporate-muted">
          This module will be implemented in the next development phase.
        </p>
      </div>
    </DashboardShell>
  );
}
