"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSeedSalaryComponents } from "@/constants/salary-component-seeds";
import {
  normalizeSalaryComponentRecord,
  type SalaryComponentRecord,
} from "@/types/salary-component";

const STORAGE_KEY = "shaandar-crm-salary-components";

/** Overtime is tracked day-by-day in Overtime Tracker — never part of monthly payroll. */
const PAYROLL_EXCLUDED_COMPONENT_NAMES = new Set(["overtime earnings"]);

function mergeWithSeeds(records: SalaryComponentRecord[]): SalaryComponentRecord[] {
  const byName = new Map<string, SalaryComponentRecord>();
  for (const seed of buildSeedSalaryComponents()) {
    byName.set(seed.componentName.toLowerCase(), seed);
  }
  for (const row of records) {
    if (PAYROLL_EXCLUDED_COMPONENT_NAMES.has(row.componentName.toLowerCase())) {
      continue;
    }
    byName.set(row.componentName.toLowerCase(), row);
  }
  return Array.from(byName.values())
    .filter((row) => !PAYROLL_EXCLUDED_COMPONENT_NAMES.has(row.componentName.toLowerCase()))
    .sort((a, b) => a.componentName.localeCompare(b.componentName));
}

function readComponents(): SalaryComponentRecord[] {
  if (typeof window === "undefined") return buildSeedSalaryComponents();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeWithSeeds([]);
    const parsed = JSON.parse(raw) as Partial<SalaryComponentRecord>[];
    if (!Array.isArray(parsed)) return mergeWithSeeds([]);
    const records = parsed
      .filter(
        (row): row is Partial<SalaryComponentRecord> & { id: string } => Boolean(row?.id)
      )
      .map((row) => normalizeSalaryComponentRecord(row));
    return mergeWithSeeds(records);
  } catch {
    return mergeWithSeeds([]);
  }
}

function writeComponents(records: SalaryComponentRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useSalaryComponents() {
  const [components, setComponents] = useState<SalaryComponentRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loaded = readComponents();
    setComponents(loaded);
    writeComponents(loaded);
    setIsReady(true);
  }, []);

  const persist = useCallback((next: SalaryComponentRecord[]) => {
    const merged = mergeWithSeeds(next);
    setComponents(merged);
    writeComponents(merged);
  }, []);

  const payrollSummary = useMemo(() => {
    const earnings = components.filter((row) => row.componentType === "earning");
    const deductions = components.filter((row) => row.componentType === "deduction");
    return {
      earnings,
      deductions,
      earningsCount: earnings.length,
      deductionsCount: deductions.length,
    };
  }, [components]);

  const addComponent = useCallback(
    (
      input: Omit<SalaryComponentRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">
    ) => {
      const now = new Date().toISOString();
      const record = normalizeSalaryComponentRecord({
        ...input,
        id: `salcomp-${Date.now()}`,
        isSystemSeed: false,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readComponents()]);
      return record;
    },
    [persist]
  );

  const updateComponent = useCallback(
    (
      id: string,
      input: Omit<SalaryComponentRecord, "id" | "isSystemSeed" | "createdAt" | "updatedAt">
    ) => {
      const next = readComponents().map((row) =>
        row.id === id
          ? normalizeSalaryComponentRecord({
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

  const removeComponent = useCallback(
    (id: string) => {
      const target = readComponents().find((row) => row.id === id);
      if (target?.isSystemSeed) return false;
      persist(readComponents().filter((row) => row.id !== id));
      return true;
    },
    [persist]
  );

  return {
    components,
    payrollSummary,
    isReady,
    addComponent,
    updateComponent,
    removeComponent,
  };
}
