"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteManagedUser,
  readManagedUsers,
  upsertManagedUser,
  updateManagedUser,
  writeManagedUsers,
} from "@/lib/managed-users-store";
import {
  assignInitialUserPipelineStage,
  migrateLegacyUsersToSavedStage,
  readUsersByPipelineStage,
} from "@/lib/user-pipeline-store";
import type { ManagedUserRecord } from "@/types/managed-user";
import type { UserPipelineStage } from "@/types/user-pipeline";

export function useManagedUsers() {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(() => {
    migrateLegacyUsersToSavedStage();
    setUsers(readManagedUsers());
  }, []);

  useEffect(() => {
    reload();
    setIsReady(true);
  }, [reload]);

  const addUser = useCallback((user: ManagedUserRecord, pipelineStage: UserPipelineStage) => {
    const nextUser = assignInitialUserPipelineStage({
      ...user,
      pipelineStage,
    });
    const next = upsertManagedUser(nextUser);
    setUsers(next);
    return next;
  }, []);

  const editUser = useCallback(
    (
      userId: string,
      patch: Partial<
        Pick<ManagedUserRecord, "fullName" | "username" | "password" | "role" | "otpEnabled">
      >
    ) => {
      const next = updateManagedUser(userId, patch);
      setUsers(next);
      return next;
    },
    []
  );

  const removeUser = useCallback((userId: string) => {
    const next = deleteManagedUser(userId);
    setUsers(next);
    return next;
  }, []);

  const setOtpEnabled = useCallback((userId: string, otpEnabled: boolean) => {
    const next = updateManagedUser(userId, { otpEnabled });
    setUsers(next);
    return next;
  }, []);

  const getUsersByStage = useCallback(
    (stage: UserPipelineStage) => readUsersByPipelineStage(stage),
    []
  );

  const replaceAll = useCallback((records: ManagedUserRecord[]) => {
    writeManagedUsers(records);
    setUsers(records);
  }, []);

  return {
    users,
    isReady,
    addUser,
    editUser,
    removeUser,
    setOtpEnabled,
    getUsersByStage,
    replaceAll,
    reload,
  };
}
