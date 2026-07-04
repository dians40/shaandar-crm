"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSeedAccountGroups } from "@/constants/account-groups";
import {
  normalizeAccountGroupRecord,
  type AccountGroupRecord,
} from "@/types/account-group";

const STORAGE_KEY = "shaandar-crm-account-group-records";
const LEGACY_STORAGE_KEY = "shaandar-crm-account-groups";

function mergeWithSeeds(records: AccountGroupRecord[]): AccountGroupRecord[] {
  const seeds = buildSeedAccountGroups();
  const byName = new Map<string, AccountGroupRecord>();

  for (const seed of seeds) {
    byName.set(seed.name.toLowerCase(), seed);
  }

  for (const row of records) {
    byName.set(row.name.toLowerCase(), row);
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function migrateLegacyGroups(): AccountGroupRecord[] {
  if (typeof window === "undefined") return buildSeedAccountGroups();
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return buildSeedAccountGroups();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return buildSeedAccountGroups();

    const now = new Date().toISOString();
    const legacyNames = parsed.filter((item): item is string => typeof item === "string");
    const custom = legacyNames
      .filter(
        (name) =>
          !buildSeedAccountGroups().some(
            (seed) => seed.name.toLowerCase() === name.toLowerCase()
          )
      )
      .map((name, index) =>
        normalizeAccountGroupRecord({
          id: `ag-legacy-${index + 1}`,
          name,
          parentGroup: "Primary",
          nature: "Asset",
          category: "ASSETS",
          isSystemSeed: false,
          createdAt: now,
          updatedAt: now,
        })
      );

    return mergeWithSeeds(custom);
  } catch {
    return buildSeedAccountGroups();
  }
}

function readAccountGroups(): AccountGroupRecord[] {
  if (typeof window === "undefined") return buildSeedAccountGroups();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacyGroups();
    const parsed = JSON.parse(raw) as Partial<AccountGroupRecord>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return migrateLegacyGroups();

    const records = parsed
      .filter((row): row is Partial<AccountGroupRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeAccountGroupRecord(row));

    return mergeWithSeeds(records);
  } catch {
    return buildSeedAccountGroups();
  }
}

function writeAccountGroups(records: AccountGroupRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useAccountGroups() {
  const [groups, setGroups] = useState<AccountGroupRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loaded = readAccountGroups();
    setGroups(loaded);
    writeAccountGroups(loaded);
    setIsReady(true);
  }, []);

  const persist = useCallback((next: AccountGroupRecord[]) => {
    const merged = mergeWithSeeds(next);
    setGroups(merged);
    writeAccountGroups(merged);
  }, []);

  const groupNames = useMemo(() => groups.map((group) => group.name), [groups]);

  const parentOptions = useMemo(
    () => ["Primary", ...groups.map((group) => group.name)],
    [groups]
  );

  const addGroup = useCallback(
    (input: Omit<AccountGroupRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeAccountGroupRecord({
        ...input,
        id: `ag-${Date.now()}`,
        isSystemSeed: false,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readAccountGroups()]);
      return record;
    },
    [persist]
  );

  const updateGroup = useCallback(
    (
      id: string,
      input: Omit<AccountGroupRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">
    ) => {
      const next = readAccountGroups().map((row) =>
        row.id === id
          ? normalizeAccountGroupRecord({
              ...row,
              ...input,
              id: row.id,
              isSystemSeed: row.isSystemSeed,
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
      const target = readAccountGroups().find((row) => row.id === id);
      if (target?.isSystemSeed) return false;
      persist(readAccountGroups().filter((row) => row.id !== id));
      return true;
    },
    [persist]
  );

  return {
    groups,
    groupNames,
    parentOptions,
    isReady,
    addGroup,
    updateGroup,
    removeGroup,
  };
}
