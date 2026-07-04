"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeUnitConversionRecord,
  type UnitConversionRecord,
} from "@/types/unit-conversion";

const STORAGE_KEY = "shaandar-crm-unit-conversions";

function readConversions(): UnitConversionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<UnitConversionRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<UnitConversionRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeUnitConversionRecord(row));
  } catch {
    return [];
  }
}

function writeConversions(records: UnitConversionRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useUnitConversions() {
  const [conversions, setConversions] = useState<UnitConversionRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setConversions(readConversions());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: UnitConversionRecord[]) => {
    setConversions(next);
    writeConversions(next);
  }, []);

  const addConversion = useCallback(
    (
      input: Omit<UnitConversionRecord, "id" | "createdAt" | "updatedAt">
    ) => {
      const now = new Date().toISOString();
      const record = normalizeUnitConversionRecord({
        ...input,
        id: `uc-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readConversions()]);
      return record;
    },
    [persist]
  );

  const updateConversion = useCallback(
    (
      id: string,
      input: Omit<UnitConversionRecord, "id" | "createdAt" | "updatedAt">
    ) => {
      const next = readConversions().map((row) =>
        row.id === id
          ? normalizeUnitConversionRecord({
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

  const removeConversion = useCallback(
    (id: string) => {
      persist(readConversions().filter((row) => row.id !== id));
    },
    [persist]
  );

  return {
    conversions,
    isReady,
    addConversion,
    updateConversion,
    removeConversion,
  };
}
