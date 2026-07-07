"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteManagedUserOnServer,
  fetchManagedUsersFromServer,
  readManagedUsers,
  syncManagedUsersToServer,
  upsertManagedUserOnServer,
  updateManagedUser,
  writeManagedUsers,
} from "@/lib/managed-users-store";
import {
  assignInitialUserPipelineStage,
  migrateLegacyUsersToSavedStage,
  readUsersByPipelineStage,
} from "@/lib/user-pipeline-store";
import {
  LAYER_2_USER_ROLE,
  LAYER_3_USER_ROLE,
  LAYER_4_USER_ROLE,
  type ManagedUserRecord,
} from "@/types/managed-user";
import { USER_PIPELINE_STAGES, type UserPipelineStage } from "@/types/user-pipeline";
import type { UserRoleName } from "@/types/user-permissions";

function applyLayerRoleTokens(
  user: ManagedUserRecord,
  pipelineStage: UserPipelineStage
): ManagedUserRecord {
  const staged = assignInitialUserPipelineStage({
    ...user,
    pipelineStage,
  });

  let role: UserRoleName = staged.role;
  if (pipelineStage === USER_PIPELINE_STAGES.LAYER_2_STAGING) {
    role = LAYER_2_USER_ROLE;
  } else if (pipelineStage === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW) {
    role = LAYER_3_USER_ROLE;
  } else if (pipelineStage === USER_PIPELINE_STAGES.LAYER_4_SAVED) {
    role = LAYER_4_USER_ROLE;
  }

  return {
    ...staged,
    role,
    pipelineStage,
  };
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
      const refreshed = await fetchManagedUsersFromServer();
      if (refreshed !== null) {
        writeManagedUsers(refreshed);
        setUsers(refreshed);
      }
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

  const addUser = useCallback(
    async (user: ManagedUserRecord, pipelineStage: UserPipelineStage) => {
      const nextUser = applyLayerRoleTokens(user, pipelineStage);
      const result = await upsertManagedUserOnServer(nextUser);
      if (result.ok) {
        setUsers(result.users);
        return;
      }

      const fallback = [nextUser, ...readManagedUsers().filter((row) => row.id !== nextUser.id)];
      writeManagedUsers(fallback);
      setUsers(fallback);
      await syncManagedUsersToServer(fallback);
      await reload();
    },
    [reload]
  );

  const editUser = useCallback(
    async (
      userId: string,
      patch: Partial<
        Pick<ManagedUserRecord, "fullName" | "username" | "password" | "role" | "otpEnabled">
      >
    ) => {
      const existing = readManagedUsers().find((row) => row.id === userId);
      if (!existing) return;

      const updated = { ...existing, ...patch };
      const result = await upsertManagedUserOnServer(updated);
      if (result.ok) {
        setUsers(result.users);
        return;
      }

      const next = updateManagedUser(userId, patch);
      setUsers(next);
      await syncManagedUsersToServer(next);
      await reload();
    },
    [reload]
  );

  const removeUser = useCallback(
    async (userId: string) => {
      const result = await deleteManagedUserOnServer(userId);
      if (result.ok) {
        setUsers(result.users);
        return result.users;
      }

      const next = readManagedUsers().filter((row) => row.id !== userId);
      writeManagedUsers(next);
      setUsers(next);
      await syncManagedUsersToServer(next);
      await reload();
      return next;
    },
    [reload]
  );

  const setOtpEnabled = useCallback(
    async (userId: string, otpEnabled: boolean) => {
      return editUser(userId, { otpEnabled });
    },
    [editUser]
  );

  const getUsersByStage = useCallback(
    (stage: UserPipelineStage) => readUsersByPipelineStage(stage),
    []
  );

  const replaceAll = useCallback(
    async (records: ManagedUserRecord[]) => {
      writeManagedUsers(records);
      setUsers(records);
      await syncManagedUsersToServer(records);
      await reload();
    },
    [reload]
  );

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
