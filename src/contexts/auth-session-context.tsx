"use client";

import { createContext, useContext } from "react";
import type { AuthSessionPayload } from "@/types/auth-session";
import { isLayer2StagingUser } from "@/types/auth-session";

type AuthSessionContextValue = {
  session: AuthSessionPayload | null;
  isLayer2StagingOnly: boolean;
};

const AuthSessionContext = createContext<AuthSessionContextValue>({
  session: null,
  isLayer2StagingOnly: false,
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
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
