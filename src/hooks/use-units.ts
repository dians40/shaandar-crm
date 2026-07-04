"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSeedUnits } from "@/constants/units";
import { normalizeUnitRecord, type UnitRecord } from "@/types/unit";

const STORAGE_KEY = "shaandar-crm-units";

function mergeWithSeeds(records: UnitRecord[]): UnitRecord[] {
  const seeds = buildSeedUnits();
  const byName = new Map<string, UnitRecord>();

  for (const seed of seeds) {
    byName.set(seed.name.toLowerCase(), { ...seed, nameHindi: "" });
  }

  for (const row of records) {
    byName.set(row.name.toLowerCase(), { ...row, nameHindi: "" });
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function readUnits(): UnitRecord[] {
  if (typeof window === "undefined") return buildSeedUnits();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedUnits();
    const parsed = JSON.parse(raw) as Partial<UnitRecord>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return buildSeedUnits();

    const records = parsed
      .filter((row): row is Partial<UnitRecord> & { id: string } => Boolean(row?.id))
      .map((row) => normalizeUnitRecord(row));

    return mergeWithSeeds(records);
  } catch {
    return buildSeedUnits();
  }
}

function writeUnits(records: UnitRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useUnits() {
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loaded = readUnits();
    setUnits(loaded);
    writeUnits(loaded);
    setIsReady(true);
  }, []);

  const persist = useCallback((next: UnitRecord[]) => {
    const merged = mergeWithSeeds(next);
    setUnits(merged);
    writeUnits(merged);
  }, []);

  const unitOptions = useMemo(
    () =>
      units.map((unit) => ({
        value: unit.id,
        label: unit.name,
        name: unit.name,
      })),
    [units]
  );

  const addUnit = useCallback(
    (input: Omit<UnitRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeUnitRecord({
        ...input,
        id: `unit-${Date.now()}`,
        isSystemSeed: false,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readUnits()]);
      return record;
    },
    [persist]
  );

  const updateUnit = useCallback(
    (
      id: string,
      input: Omit<UnitRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">
    ) => {
      const next = readUnits().map((row) =>
        row.id === id
          ? normalizeUnitRecord({
              ...row,
              ...input,
              id: row.id,
              isSystemSeed: row.isSystemSeed,
              name: row.isSystemSeed ? row.name : input.name,
              createdAt: row.createdAt,
              updatedAt: new Date().toISOString(),
            })
          : row
      );
      persist(next);
    },
    [persist]
  );

  const removeUnit = useCallback(
    (id: string) => {
      const target = readUnits().find((row) => row.id === id);
      if (target?.isSystemSeed) return false;
      persist(readUnits().filter((row) => row.id !== id));
      return true;
    },
    [persist]
  );

  return { units, unitOptions, isReady, addUnit, updateUnit, removeUnit };
}
