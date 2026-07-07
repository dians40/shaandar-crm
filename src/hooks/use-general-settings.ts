"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONTRACTOR_SEEDS,
  DEFAULT_DEPARTMENT_SEEDS,
  DEFAULT_EMPLOYEE_TYPE_SEEDS,
  DEFAULT_OVERTIME_REASON_SEEDS,
  normalizeGeneralSettingsRecord,
  type GeneralSettingsRecord,
} from "@/types/general-settings";

export const GENERAL_SETTINGS_STORAGE_KEY = "shaandar-crm-general-settings";

type GeneralSettingsStore = {
  contractors: GeneralSettingsRecord[];
  employeeTypes: GeneralSettingsRecord[];
  departments: GeneralSettingsRecord[];
  overtimeReasons: GeneralSettingsRecord[];
};

type LegacyGeneralSettingsStore = Partial<GeneralSettingsStore> & {
  machines?: GeneralSettingsRecord[];
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
    departments: createSeedRecords(DEFAULT_DEPARTMENT_SEEDS, "department"),
    overtimeReasons: createSeedRecords(DEFAULT_OVERTIME_REASON_SEEDS, "overtime-reason"),
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
    const raw = window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as LegacyGeneralSettingsStore;
    const defaults = defaultStore();
    const departments = normalizeRecordList(parsed.departments);
    return {
      contractors: normalizeRecordList(parsed.contractors).length
        ? normalizeRecordList(parsed.contractors)
        : defaults.contractors,
      employeeTypes: normalizeRecordList(parsed.employeeTypes).length
        ? normalizeRecordList(parsed.employeeTypes)
        : defaults.employeeTypes,
      departments: departments.length ? departments : defaults.departments,
      overtimeReasons: normalizeRecordList(parsed.overtimeReasons).length
        ? normalizeRecordList(parsed.overtimeReasons)
        : defaults.overtimeReasons,
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store: GeneralSettingsStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(store));
}

type SubMasterKey = keyof GeneralSettingsStore;

function toSelectOptions(records: GeneralSettingsRecord[]) {
  return records.map((record) => ({ value: record.name, label: record.name }));
}

export function useGeneralSettings() {
  const [store, setStore] = useState<GeneralSettingsStore>(defaultStore());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = () => {
      const loaded = readStore();
      setStore(loaded);
      if (typeof window !== "undefined" && !window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY)) {
        writeStore(loaded);
      }
      setIsReady(true);
    };

    load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === GENERAL_SETTINGS_STORAGE_KEY) {
        load();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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

  const departmentOptions = useMemo(
    () => toSelectOptions(store.departments),
    [store.departments]
  );

  const contractorNames = useMemo(
    () => store.contractors.map((row) => row.name),
    [store.contractors]
  );

  const employeeTypeNames = useMemo(
    () => store.employeeTypes.map((row) => row.name),
    [store.employeeTypes]
  );

  const departmentNames = useMemo(
    () => store.departments.map((row) => row.name),
    [store.departments]
  );

  const overtimeReasonOptions = useMemo(
    () => toSelectOptions(store.overtimeReasons),
    [store.overtimeReasons]
  );

  const overtimeReasonNames = useMemo(
    () => store.overtimeReasons.map((row) => row.name),
    [store.overtimeReasons]
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
    departments: store.departments,
    overtimeReasons: store.overtimeReasons,
    contractorOptions,
    employeeTypeOptions,
    departmentOptions,
    overtimeReasonOptions,
    contractorNames,
    employeeTypeNames,
    departmentNames,
    overtimeReasonNames,
    /** @deprecated Use departmentOptions — Machine Master renamed to Department. */
    machines: store.departments,
    /** @deprecated Use departmentOptions — Machine Master renamed to Department. */
    machineOptions: departmentOptions,
    /** @deprecated Use departmentNames — Machine Master renamed to Department. */
    machineNames: departmentNames,
    isReady,
    addRecord,
    updateRecord,
    removeRecord,
  };
}
