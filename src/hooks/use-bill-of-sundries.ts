"use client";

import { useCallback, useEffect, useState } from "react";
import { buildSeedBillOfSundries } from "@/constants/bill-of-sundries-seeds";
import {
  normalizeBillOfSundryRecord,
  type BillOfSundryRecord,
} from "@/types/bill-of-sundry";

const STORAGE_KEY = "shaandar-crm-bill-of-sundries";

function mergeWithSeeds(records: BillOfSundryRecord[]): BillOfSundryRecord[] {
  const byName = new Map<string, BillOfSundryRecord>();
  for (const seed of buildSeedBillOfSundries()) {
    byName.set(seed.sundryName.toLowerCase(), seed);
  }
  for (const row of records) {
    byName.set(row.sundryName.toLowerCase(), row);
  }
  return Array.from(byName.values()).sort((a, b) =>
    a.sundryName.localeCompare(b.sundryName)
  );
}

function readSundries(): BillOfSundryRecord[] {
  if (typeof window === "undefined") return buildSeedBillOfSundries();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeWithSeeds([]);
    const parsed = JSON.parse(raw) as Partial<BillOfSundryRecord>[];
    if (!Array.isArray(parsed)) return mergeWithSeeds([]);
    const records = parsed
      .filter((row): row is Partial<BillOfSundryRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeBillOfSundryRecord(row));
    return mergeWithSeeds(records);
  } catch {
    return mergeWithSeeds([]);
  }
}

function writeSundries(records: BillOfSundryRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useBillOfSundries() {
  const [sundries, setSundries] = useState<BillOfSundryRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loaded = readSundries();
    setSundries(loaded);
    writeSundries(loaded);
    setIsReady(true);
  }, []);

  const persist = useCallback((next: BillOfSundryRecord[]) => {
    const merged = mergeWithSeeds(next);
    setSundries(merged);
    writeSundries(merged);
  }, []);

  const addSundry = useCallback(
    (input: Omit<BillOfSundryRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeBillOfSundryRecord({
        ...input,
        id: `sundry-${Date.now()}`,
        isSystemSeed: false,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readSundries()]);
      return record;
    },
    [persist]
  );

  const updateSundry = useCallback(
    (
      id: string,
      input: Omit<BillOfSundryRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">
    ) => {
      const next = readSundries().map((row) =>
        row.id === id
          ? normalizeBillOfSundryRecord({
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

  const removeSundry = useCallback(
    (id: string) => {
      const target = readSundries().find((row) => row.id === id);
      if (target?.isSystemSeed) return false;
      persist(readSundries().filter((row) => row.id !== id));
      return true;
    },
    [persist]
  );

  return { sundries, isReady, addSundry, updateSundry, removeSundry };
}
