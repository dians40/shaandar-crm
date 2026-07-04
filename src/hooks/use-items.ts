"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeItemRecord, type ItemRecord } from "@/types/item";

const STORAGE_KEY = "shaandar-crm-items";

function readItems(): ItemRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ItemRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<ItemRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeItemRecord(row));
  } catch {
    return [];
  }
}

function writeItems(records: ItemRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useItems() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setItems(readItems());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: ItemRecord[]) => {
    setItems(next);
    writeItems(next);
  }, []);

  const addItem = useCallback(
    (input: Omit<ItemRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeItemRecord({
        ...input,
        id: `item-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readItems()]);
      return record;
    },
    [persist]
  );

  const updateItem = useCallback(
    (id: string, input: Omit<ItemRecord, "id" | "createdAt" | "updatedAt">) => {
      const next = readItems().map((row) =>
        row.id === id
          ? normalizeItemRecord({
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

  const removeItem = useCallback(
    (id: string) => {
      persist(readItems().filter((row) => row.id !== id));
    },
    [persist]
  );

  return { items, isReady, addItem, updateItem, removeItem };
}
