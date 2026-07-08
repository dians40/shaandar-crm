"use client";

import { useCallback, useEffect, useState } from "react";
import {
  computePacketVariance,
  normalizeGlassPackingRecord,
  type GlassPackingFormState,
  type GlassPackingRecord,
} from "@/types/glass-packing";

const STORAGE_KEY = "shaandar-crm-glass-packing-records";

function readRecords(): GlassPackingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<GlassPackingRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<GlassPackingRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeGlassPackingRecord(row));
  } catch {
    return [];
  }
}

function writeRecords(records: GlassPackingRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useGlassPackingRecords() {
  const [records, setRecords] = useState<GlassPackingRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readRecords());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: GlassPackingRecord[]) => {
    setRecords(next);
    writeRecords(next);
  }, []);

  const addRecord = useCallback(
    (input: GlassPackingFormState) => {
      const now = new Date().toISOString();
      const variance = computePacketVariance(input.targetPackets, input.achievementPackets);
      const record = normalizeGlassPackingRecord({
        ...input,
        ...variance,
        id: `glass-packing-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readRecords()]);
      return record;
    },
    [persist]
  );

  const deleteRecord = useCallback(
    (id: string) => {
      persist(readRecords().filter((row) => row.id !== id));
    },
    [persist]
  );

  return {
    records,
    isReady,
    addRecord,
    deleteRecord,
  };
}
