"use client";

import { useCallback, useEffect, useState } from "react";
import type { GodownRecord } from "@/types/godown";

const STORAGE_KEY = "shaandar-crm-godowns";

function readGodowns(): GodownRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GodownRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGodowns(records: GodownRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useGodowns() {
  const [godowns, setGodowns] = useState<GodownRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setGodowns(readGodowns());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: GodownRecord[]) => {
    setGodowns(next);
    writeGodowns(next);
  }, []);

  const addGodown = useCallback(
    (input: Omit<GodownRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record: GodownRecord = {
        ...input,
        id: `godown-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      persist([record, ...readGodowns()]);
      return record;
    },
    [persist]
  );

  const updateGodown = useCallback(
    (id: string, input: Omit<GodownRecord, "id" | "createdAt" | "updatedAt">) => {
      const next = readGodowns().map((row) =>
        row.id === id
          ? { ...row, ...input, updatedAt: new Date().toISOString() }
          : row
      );
      persist(next);
    },
    [persist]
  );

  const removeGodown = useCallback(
    (id: string) => {
      persist(readGodowns().filter((row) => row.id !== id));
    },
    [persist]
  );

  return { godowns, isReady, addGodown, updateGodown, removeGodown };
}
