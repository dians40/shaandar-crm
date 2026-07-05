"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeJournalEntryRecord,
  type JournalEntryFormState,
  type JournalEntryRecord,
} from "@/types/accounting-voucher";

const STORAGE_KEY = "shaandar-crm-journal-entries";

function readEntries(): JournalEntryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<JournalEntryRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<JournalEntryRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeJournalEntryRecord(row));
  } catch {
    return [];
  }
}

function writeEntries(records: JournalEntryRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useJournalEntries() {
  const [records, setRecords] = useState<JournalEntryRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readEntries());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: JournalEntryRecord[]) => {
    setRecords(next);
    writeEntries(next);
  }, []);

  const addEntry = useCallback(
    (input: JournalEntryFormState) => {
      const now = new Date().toISOString();
      const record = normalizeJournalEntryRecord({
        ...input,
        id: `journal-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readEntries()]);
      return record;
    },
    [persist]
  );

  const updateEntry = useCallback(
    (id: string, input: JournalEntryFormState) => {
      const next = readEntries().map((row) =>
        row.id === id
          ? normalizeJournalEntryRecord({
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

  return { records, isReady, addEntry, updateEntry };
}
