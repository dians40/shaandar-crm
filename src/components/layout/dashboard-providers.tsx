"use client";

import { UserPermissionsProvider } from "@/contexts/user-permissions-context";
import { AuthSessionProvider } from "@/contexts/auth-session-context";
import type { AuthSessionPayload } from "@/types/auth-session";

export default function DashboardProviders({
  session,
  children,
}: {
  session: AuthSessionPayload | null;
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider session={session}>
      <UserPermissionsProvider>{children}</UserPermissionsProvider>
    </AuthSessionProvider>
  );
}
