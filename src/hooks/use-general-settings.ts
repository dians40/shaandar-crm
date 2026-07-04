"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONTRACTOR_SEEDS,
  DEFAULT_EMPLOYEE_TYPE_SEEDS,
  DEFAULT_MACHINE_SEEDS,
  normalizeGeneralSettingsRecord,
  type GeneralSettingsRecord,
} from "@/types/general-settings";

const STORAGE_KEY = "shaandar-crm-general-settings";

type GeneralSettingsStore = {
  contractors: GeneralSettingsRecord[];
  employeeTypes: GeneralSettingsRecord[];
  machines: GeneralSettingsRecord[];
};

function createSeedRecords(names: string[], prefix: string): GeneralSettingsRecord[] {
  const now = new Date().toISOString();
  return names.map((name, index) =>
    normalizeGeneralSettingsRecord({
      id: `${prefix}-seed-${index}`,
      name,
      createdAt: now,
      updatedAt: now,
    })
  );
}

function defaultStore(): GeneralSettingsStore {
  return {
    contractors: createSeedRecords(DEFAULT_CONTRACTOR_SEEDS, "contractor"),
    employeeTypes: createSeedRecords(DEFAULT_EMPLOYEE_TYPE_SEEDS, "employee-type"),
    machines: createSeedRecords(DEFAULT_MACHINE_SEEDS, "machine"),
  };
}

function normalizeRecordList(value: unknown): GeneralSettingsRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row === "object" && "id" in row && row.id)
    .map((row) =>
      normalizeGeneralSettingsRecord(row as Partial<GeneralSettingsRecord> & { id: string })
    );
}

function readStore(): GeneralSettingsStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<GeneralSettingsStore>;
    const defaults = defaultStore();
    return {
      contractors: normalizeRecordList(parsed.contractors).length
        ? normalizeRecordList(parsed.contractors)
        : defaults.contractors,
      employeeTypes: normalizeRecordList(parsed.employeeTypes).length
        ? normalizeRecordList(parsed.employeeTypes)
        : defaults.employeeTypes,
      machines: normalizeRecordList(parsed.machines).length
        ? normalizeRecordList(parsed.machines)
        : defaults.machines,
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store: GeneralSettingsStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

type SubMasterKey = keyof GeneralSettingsStore;

function toSelectOptions(records: GeneralSettingsRecord[]) {
  return records.map((record) => ({ value: record.name, label: record.name }));
}

export function useGeneralSettings() {
  const [store, setStore] = useState<GeneralSettingsStore>(defaultStore());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loaded = readStore();
    setStore(loaded);
    if (typeof window !== "undefined" && !window.localStorage.getItem(STORAGE_KEY)) {
      writeStore(loaded);
    }
    setIsReady(true);
  }, []);

  const persist = useCallback((next: GeneralSettingsStore) => {
    setStore(next);
    writeStore(next);
  }, []);

  const contractorOptions = useMemo(
    () => toSelectOptions(store.contractors),
    [store.contractors]
  );

  const employeeTypeOptions = useMemo(
    () => toSelectOptions(store.employeeTypes),
    [store.employeeTypes]
  );

  const machineOptions = useMemo(
    () => toSelectOptions(store.machines),
    [store.machines]
  );

  const contractorNames = useMemo(
    () => store.contractors.map((row) => row.name),
    [store.contractors]
  );

  const employeeTypeNames = useMemo(
    () => store.employeeTypes.map((row) => row.name),
    [store.employeeTypes]
  );

  const machineNames = useMemo(
    () => store.machines.map((row) => row.name),
    [store.machines]
  );

  const addRecord = useCallback(
    (key: SubMasterKey, name: string) => {
      const now = new Date().toISOString();
      const record = normalizeGeneralSettingsRecord({
        id: `${key}-${Date.now()}`,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
      });
      const current = readStore();
      persist({
        ...current,
        [key]: [record, ...current[key]],
      });
      return record;
    },
    [persist]
  );

  const updateRecord = useCallback(
    (key: SubMasterKey, id: string, name: string) => {
      const current = readStore();
      persist({
        ...current,
        [key]: current[key].map((row) =>
          row.id === id
            ? normalizeGeneralSettingsRecord({
                ...row,
                name: name.trim(),
                id: row.id,
                createdAt: row.createdAt,
                updatedAt: new Date().toISOString(),
              })
            : row
        ),
      });
    },
    [persist]
  );

  const removeRecord = useCallback(
    (key: SubMasterKey, id: string) => {
      const current = readStore();
      persist({
        ...current,
        [key]: current[key].filter((row) => row.id !== id),
      });
    },
    [persist]
  );

  return {
    contractors: store.contractors,
    employeeTypes: store.employeeTypes,
    machines: store.machines,
    contractorOptions,
    employeeTypeOptions,
    machineOptions,
    contractorNames,
    employeeTypeNames,
    machineNames,
    isReady,
    addRecord,
    updateRecord,
    removeRecord,
  };
}
