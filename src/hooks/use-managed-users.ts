"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readManagedUsers,
  upsertManagedUser,
  updateManagedUser,
  writeManagedUsers,
} from "@/lib/managed-users-store";
import type { ManagedUserRecord } from "@/types/managed-user";

export function useManagedUsers() {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUsers(readManagedUsers());
    setIsReady(true);
  }, []);

  const addUser = useCallback((user: ManagedUserRecord) => {
    const next = upsertManagedUser(user);
    setUsers(next);
    return next;
  }, []);

  const setOtpEnabled = useCallback((userId: string, otpEnabled: boolean) => {
    const next = updateManagedUser(userId, { otpEnabled });
    setUsers(next);
    return next;
  }, []);

  const replaceAll = useCallback((records: ManagedUserRecord[]) => {
    writeManagedUsers(records);
    setUsers(records);
  }, []);

  const reload = useCallback(() => {
    setUsers(readManagedUsers());
  }, []);

  return {
    users,
    isReady,
    addUser,
    setOtpEnabled,
    replaceAll,
    reload,
  };
}
