"use client";

import { createContext, useContext } from "react";
import type { AuthSessionPayload, RestrictedAttendanceMode } from "@/types/auth-session";
import {
  getRestrictedAttendanceMode,
  isFullAccessUser,
  isRestrictedAttendanceUser,
} from "@/types/auth-session";

type AuthSessionContextValue = {
  session: AuthSessionPayload | null;
  restrictedAttendanceMode: RestrictedAttendanceMode | null;
  isRestrictedAttendanceUser: boolean;
  /** @deprecated Use restrictedAttendanceMode === "stagingOnly" */
  isLayer2StagingOnly: boolean;
  isFullAccess: boolean;
};

const AuthSessionContext = createContext<AuthSessionContextValue>({
  session: null,
  restrictedAttendanceMode: null,
  isRestrictedAttendanceUser: false,
  isLayer2StagingOnly: false,
  isFullAccess: true,
});

export function AuthSessionProvider({
  session,
  children,
}: {
  session: AuthSessionPayload | null;
  children: React.ReactNode;
}) {
  const restrictedAttendanceMode = getRestrictedAttendanceMode(session);

  return (
    <AuthSessionContext.Provider
      value={{
        session,
        restrictedAttendanceMode,
        isRestrictedAttendanceUser: isRestrictedAttendanceUser(session),
        isLayer2StagingOnly: restrictedAttendanceMode === "stagingOnly",
        isFullAccess: isFullAccessUser(session),
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
