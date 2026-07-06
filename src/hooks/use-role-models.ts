"use client";

import { useCallback, useEffect, useState } from "react";
import {
  appendRoleModel,
  readRoleModels,
  removeRoleFromRoleModels,
  renameRoleInRoleModels,
} from "@/lib/role-models-store";
import type { RoleModelRecord } from "@/types/role-model";

export function useRoleModels() {
  const [records, setRecords] = useState<RoleModelRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readRoleModels());
    setIsReady(true);
  }, []);

  const addRecord = useCallback((record: RoleModelRecord) => {
    const next = appendRoleModel(record);
    setRecords(next);
    return next;
  }, []);

  const syncAfterRoleRename = useCallback((oldRole: string, newRole: string) => {
    const next = renameRoleInRoleModels(oldRole, newRole);
    setRecords(next);
    return next;
  }, []);

  const syncAfterRoleRemove = useCallback((role: string) => {
    const next = removeRoleFromRoleModels(role);
    setRecords(next);
    return next;
  }, []);

  return {
    records,
    isReady,
    addRecord,
    syncAfterRoleRename,
    syncAfterRoleRemove,
  };
}
