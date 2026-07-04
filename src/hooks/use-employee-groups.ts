"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeEmployeeGroupRecord,
  type EmployeeGroupRecord,
} from "@/types/employee-group";

const STORAGE_KEY = "shaandar-crm-employee-groups";

function readGroups(): EmployeeGroupRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<EmployeeGroupRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<EmployeeGroupRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeEmployeeGroupRecord(row));
  } catch {
    return [];
  }
}

function writeGroups(records: EmployeeGroupRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useEmployeeGroups() {
  const [groups, setGroups] = useState<EmployeeGroupRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setGroups(readGroups());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: EmployeeGroupRecord[]) => {
    setGroups(next);
    writeGroups(next);
  }, []);

  const addGroup = useCallback(
    (input: Omit<EmployeeGroupRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeEmployeeGroupRecord({
        ...input,
        id: `emp-group-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readGroups()]);
      return record;
    },
    [persist]
  );

  const updateGroup = useCallback(
    (
      id: string,
      input: Omit<EmployeeGroupRecord, "id" | "createdAt" | "updatedAt">
    ) => {
      const next = readGroups().map((row) =>
        row.id === id
          ? normalizeEmployeeGroupRecord({
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
      persist(readGroups().filter((row) => row.id !== id));
    },
    [persist]
  );

  return { groups, isReady, addGroup, updateGroup, removeGroup };
}
