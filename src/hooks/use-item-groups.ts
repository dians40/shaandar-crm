"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ITEM_GROUP_PRIMARY_PARENT,
  normalizeItemGroupRecord,
  type ItemGroupRecord,
} from "@/types/item-group";

const STORAGE_KEY = "shaandar-crm-item-groups";

function readItemGroups(): ItemGroupRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ItemGroupRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<ItemGroupRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeItemGroupRecord(row));
  } catch {
    return [];
  }
}

function writeItemGroups(records: ItemGroupRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useItemGroups() {
  const [groups, setGroups] = useState<ItemGroupRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setGroups(readItemGroups());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: ItemGroupRecord[]) => {
    setGroups(next);
    writeItemGroups(next);
  }, []);

  const parentOptions = useMemo(
    () => [ITEM_GROUP_PRIMARY_PARENT, ...groups.map((group) => group.name)],
    [groups]
  );

  const groupSelectOptions = useMemo(
    () => groups.map((group) => ({ value: group.id, label: group.name })),
    [groups]
  );

  const addGroup = useCallback(
    (input: Omit<ItemGroupRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeItemGroupRecord({
        ...input,
        id: `ig-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readItemGroups()]);
      return record;
    },
    [persist]
  );

  const updateGroup = useCallback(
    (id: string, input: Omit<ItemGroupRecord, "id" | "createdAt" | "updatedAt">) => {
      const next = readItemGroups().map((row) =>
        row.id === id
          ? normalizeItemGroupRecord({
              ...row,
              ...input,
              id: row.id,
              createdAt: row.createdAt,
              updatedAt: new Date().toISOString(),
            })
          : row
      );
      persist(next);
    },
    [persist]
  );

  const removeGroup = useCallback(
    (id: string) => {
      persist(readItemGroups().filter((row) => row.id !== id));
    },
    [persist]
  );

  return {
    groups,
    parentOptions,
    groupSelectOptions,
    isReady,
    addGroup,
    updateGroup,
    removeGroup,
  };
}
