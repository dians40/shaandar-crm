"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizePartsOrderRecord,
  type PartsOrderFormState,
  type PartsOrderRecord,
} from "@/types/parts-order-workflow";

const STORAGE_KEY = "shaandar-crm-parts-order-records";

function readRecords(): PartsOrderRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PartsOrderRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<PartsOrderRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizePartsOrderRecord(row));
  } catch {
    return [];
  }
}

function writeRecords(records: PartsOrderRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function usePartsOrderRecords() {
  const [records, setRecords] = useState<PartsOrderRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readRecords());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: PartsOrderRecord[]) => {
    setRecords(next);
    writeRecords(next);
  }, []);

  const addRecord = useCallback(
    (input: PartsOrderFormState) => {
      const now = new Date().toISOString();
      const record = normalizePartsOrderRecord({
        ...input,
        id: `parts-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readRecords()]);
      return record;
    },
    [persist]
  );

  const updateRecord = useCallback(
    (id: string, patch: Partial<PartsOrderRecord>) => {
      const next = readRecords().map((row) =>
        row.id === id
          ? normalizePartsOrderRecord({
              ...row,
              ...patch,
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

  return { records, isReady, addRecord, updateRecord };
}
