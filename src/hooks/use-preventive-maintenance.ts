"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizePreventiveMaintenanceRule,
  type PreventiveMaintenanceFormState,
  type PreventiveMaintenanceRule,
} from "@/types/preventive-maintenance";

const STORAGE_KEY = "shaandar-crm-preventive-maintenance";

function readRules(): PreventiveMaintenanceRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PreventiveMaintenanceRule>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<PreventiveMaintenanceRule> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizePreventiveMaintenanceRule(row));
  } catch {
    return [];
  }
}

function writeRules(records: PreventiveMaintenanceRule[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function usePreventiveMaintenance() {
  const [rules, setRules] = useState<PreventiveMaintenanceRule[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRules(readRules());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: PreventiveMaintenanceRule[]) => {
    setRules(next);
    writeRules(next);
  }, []);

  const addRule = useCallback(
    (input: PreventiveMaintenanceFormState) => {
      const now = new Date().toISOString();
      const record = normalizePreventiveMaintenanceRule({
        ...input,
        id: `maint-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readRules()]);
      return record;
    },
    [persist]
  );

  const updateRule = useCallback(
    (id: string, input: PreventiveMaintenanceFormState) => {
      const next = readRules().map((row) =>
        row.id === id
          ? normalizePreventiveMaintenanceRule({
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

  return { rules, isReady, addRule, updateRule };
}
