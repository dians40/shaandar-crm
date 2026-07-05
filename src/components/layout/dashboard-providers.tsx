"use client";

import { UserPermissionsProvider } from "@/contexts/user-permissions-context";

export default function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserPermissionsProvider>{children}</UserPermissionsProvider>;
}
