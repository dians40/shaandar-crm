import {
  readManagedUsers,
  syncManagedUsersToServer,
  writeManagedUsers,
} from "@/lib/managed-users-store";
import {
  assertUserPipelineTransition,
  DEFAULT_SAVED_USER_STAGE,
  INITIAL_USER_INGEST_STAGE,
  isUserPipelineStage,
  type UserPipelineStage,
} from "@/types/user-pipeline";
import {
  resolveUserPipelineStage,
  type ManagedUserRecord,
} from "@/types/managed-user";

function isWithinDateRange(entryDate: string, fromDate: string, toDate: string): boolean {
  if (!fromDate && !toDate) return true;
  if (fromDate && entryDate < fromDate) return false;
  if (toDate && entryDate > toDate) return false;
  return true;
}

export function readUsersByPipelineStage(
  stage: UserPipelineStage,
  options: { fromDate?: string; toDate?: string; search?: string } = {}
): ManagedUserRecord[] {
  const searchToken = options.search?.trim().toLowerCase() ?? "";
  return readManagedUsers()
    .filter((user) => resolveUserPipelineStage(user) === stage)
    .filter((user) =>
      isWithinDateRange(user.createdAt.slice(0, 10), options.fromDate ?? "", options.toDate ?? "")
    )
    .filter((user) => {
      if (!searchToken) return true;
      return (
        user.fullName.toLowerCase().includes(searchToken) ||
        user.username.toLowerCase().includes(searchToken) ||
        user.role.toLowerCase().includes(searchToken)
      );
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function transitionUserPipelineStage(input: {
  ids: string[];
  from: UserPipelineStage;
  to: UserPipelineStage;
}): number {
  assertUserPipelineTransition(input.from, input.to);
  if (input.ids.length === 0) return 0;

  const idSet = new Set(input.ids);
  let transitioned = 0;
  const next = readManagedUsers().map((user) => {
    if (!idSet.has(user.id)) return user;
    if (resolveUserPipelineStage(user) !== input.from) return user;
    transitioned += 1;
    return { ...user, pipelineStage: input.to };
  });

  if (transitioned > 0) {
    writeManagedUsers(next);
    void syncManagedUsersToServer(next);
  }
  return transitioned;
}

export function assignInitialUserPipelineStage(user: ManagedUserRecord): ManagedUserRecord {
  return {
    ...user,
    pipelineStage: user.pipelineStage ?? INITIAL_USER_INGEST_STAGE,
  };
}

export function migrateLegacyUsersToSavedStage(): void {
  const users = readManagedUsers();
  const needsMigration = users.some((user) => !user.pipelineStage);
  if (!needsMigration) return;
  const migrated = users.map((user) =>
    user.pipelineStage ? user : { ...user, pipelineStage: DEFAULT_SAVED_USER_STAGE }
  );
  writeManagedUsers(migrated);
  void syncManagedUsersToServer(migrated);
}

export function parseUserPipelineStage(value: string): UserPipelineStage | null {
  return isUserPipelineStage(value) ? value : null;
}
