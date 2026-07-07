"use client";

import { createContext, useContext } from "react";
import type { AuthSessionPayload } from "@/types/auth-session";
import { isFullAccessUser, isLayer2StagingUser } from "@/types/auth-session";

type AuthSessionContextValue = {
  session: AuthSessionPayload | null;
  isLayer2StagingOnly: boolean;
  isFullAccess: boolean;
};

const AuthSessionContext = createContext<AuthSessionContextValue>({
  session: null,
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
  return (
    <AuthSessionContext.Provider
      value={{
        session,
        isLayer2StagingOnly: isLayer2StagingUser(session),
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
