import { DashboardShell } from "@/components/layout/dashboard-shell";
import DisplayPanel from "@/components/master-panel/display-panel";

export default function DisplayPage() {
  return (
    <DashboardShell
      title="Display"
      description="Tally-style daybook, ledgers, cash/bank summary, and trial balance views."
    >
      <DisplayPanel />
    </DashboardShell>
  );
}
