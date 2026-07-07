"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteManagedUser,
  fetchManagedUsersFromServer,
  readManagedUsers,
  syncManagedUsersToServer,
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

async function persistUsers(users: ManagedUserRecord[]) {
  writeManagedUsers(users);
  await syncManagedUsersToServer(users);
}

export function useManagedUsers() {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async () => {
    migrateLegacyUsersToSavedStage();

    const serverUsers = await fetchManagedUsersFromServer();
    if (serverUsers !== null) {
      writeManagedUsers(serverUsers);
      setUsers(serverUsers);
      return;
    }

    const localUsers = readManagedUsers();
    setUsers(localUsers);
    if (localUsers.length > 0) {
      await syncManagedUsersToServer(localUsers);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await reload();
      if (active) setIsReady(true);
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const addUser = useCallback((user: ManagedUserRecord, pipelineStage: UserPipelineStage) => {
    const nextUser = assignInitialUserPipelineStage({
      ...user,
      pipelineStage,
    });
    const next = upsertManagedUser(nextUser);
    setUsers(next);
    void persistUsers(next);
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
      void persistUsers(next);
      return next;
    },
    []
  );

  const removeUser = useCallback((userId: string) => {
    const next = deleteManagedUser(userId);
    setUsers(next);
    void persistUsers(next);
    return next;
  }, []);

  const setOtpEnabled = useCallback((userId: string, otpEnabled: boolean) => {
    const next = updateManagedUser(userId, { otpEnabled });
    setUsers(next);
    void persistUsers(next);
    return next;
  }, []);

  const getUsersByStage = useCallback(
    (stage: UserPipelineStage) => readUsersByPipelineStage(stage),
    []
  );

  const replaceAll = useCallback((records: ManagedUserRecord[]) => {
    writeManagedUsers(records);
    setUsers(records);
    void persistUsers(records);
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
