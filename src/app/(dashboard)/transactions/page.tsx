import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import MasterPanelView from "@/components/master-panel/master-panel-view";

export default function TransactionsPage() {
  return (
    <DashboardShell
      title="Transactions"
      description="Daily operational vouchers, orders, and transaction workflows."
    >
      <Suspense
        fallback={
          <div className="rounded-xl border border-corporate-border bg-corporate-surface p-6 text-sm text-corporate-muted">
            Loading transactions workspace...
          </div>
        }
      >
        <MasterPanelView scope="transaction" />
      </Suspense>
    </DashboardShell>
  );
}
