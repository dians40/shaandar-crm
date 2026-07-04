"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeBomRecord, type BomRecord } from "@/types/bom";

const STORAGE_KEY = "shaandar-crm-bom-records";

function readBoms(): BomRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<BomRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<BomRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeBomRecord(row));
  } catch {
    return [];
  }
}

function writeBoms(records: BomRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useBomRecords() {
  const [boms, setBoms] = useState<BomRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setBoms(readBoms());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: BomRecord[]) => {
    setBoms(next);
    writeBoms(next);
  }, []);

  const addBom = useCallback(
    (input: Omit<BomRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeBomRecord({
        ...input,
        id: `bom-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readBoms()]);
      return record;
    },
    [persist]
  );

  const updateBom = useCallback(
    (id: string, input: Omit<BomRecord, "id" | "createdAt" | "updatedAt">) => {
      const next = readBoms().map((row) =>
        row.id === id
          ? normalizeBomRecord({
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

  const removeBom = useCallback(
    (id: string) => {
      persist(readBoms().filter((row) => row.id !== id));
    },
    [persist]
  );

  return { boms, isReady, addBom, updateBom, removeBom };
}
