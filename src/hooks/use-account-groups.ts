"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ACCOUNT_GROUP_NAMES } from "@/constants/account-groups";

const STORAGE_KEY = "shaandar-crm-account-groups";

function readAccountGroups(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_ACCOUNT_GROUP_NAMES];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_ACCOUNT_GROUP_NAMES];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_ACCOUNT_GROUP_NAMES];
    }
    return parsed.filter((name): name is string => typeof name === "string");
  } catch {
    return [...DEFAULT_ACCOUNT_GROUP_NAMES];
  }
}

function writeAccountGroups(groups: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export function useAccountGroups() {
  const [groups, setGroups] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setGroups(readAccountGroups());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setGroups(next);
    writeAccountGroups(next);
  }, []);

  const addGroup = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = readAccountGroups();
      if (current.some((row) => row.toLowerCase() === trimmed.toLowerCase())) return;
      persist([...current, trimmed]);
    },
    [persist]
  );

  return { groups, isReady, addGroup };
}
