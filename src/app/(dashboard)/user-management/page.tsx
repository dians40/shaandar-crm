import { DashboardShell } from "@/components/layout/dashboard-shell";
import UserManagementPanel from "@/components/master-panel/user-management-panel";

export default function UserManagementPage() {
  return (
    <DashboardShell
      title="User Management"
      description="Role and rights permissions matrix for organizational access control."
    >
      <UserManagementPanel />
    </DashboardShell>
  );
}
