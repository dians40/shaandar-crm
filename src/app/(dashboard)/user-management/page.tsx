import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function UserManagementPage() {
  return (
    <DashboardShell
      title="User Management"
      description="Manage users, roles, and access permissions."
    >
      <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-surface p-10 text-center shadow-card">
        <p className="text-sm font-medium text-corporate-text">User Management</p>
        <p className="mt-2 text-sm text-corporate-muted">
          This module will be implemented in the next development phase.
        </p>
      </div>
    </DashboardShell>
  );
}
