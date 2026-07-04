"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeAccountRecord, type AccountRecord } from "@/types/account";

const STORAGE_KEY = "shaandar-crm-accounts";

function readAccounts(): AccountRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<AccountRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<AccountRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeAccountRecord(row));
  } catch {
    return [];
  }
}

function writeAccounts(records: AccountRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setAccounts(readAccounts());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: AccountRecord[]) => {
    setAccounts(next);
    writeAccounts(next);
  }, []);

  const addAccount = useCallback(
    (input: Omit<AccountRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record: AccountRecord = normalizeAccountRecord({
        ...input,
        id: `account-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readAccounts()]);
      return record;
    },
    [persist]
  );

  const updateAccount = useCallback(
    (id: string, input: Omit<AccountRecord, "id" | "createdAt" | "updatedAt">) => {
      const next = readAccounts().map((row) =>
        row.id === id
          ? normalizeAccountRecord({
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

  const removeAccount = useCallback(
    (id: string) => {
      persist(readAccounts().filter((row) => row.id !== id));
    },
    [persist]
  );

  return { accounts, isReady, addAccount, updateAccount, removeAccount };
}
