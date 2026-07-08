"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEPARTMENT_MASTER_REFRESH_EVENT,
  deleteDepartmentOnServer,
  fetchDepartmentsFromServer,
  upsertDepartmentOnServer,
} from "@/lib/department-master-client";
import {
  DESIGNATION_MASTER_REFRESH_EVENT,
  deleteDesignationOnServer,
  fetchDesignationsFromServer,
  upsertDesignationOnServer,
} from "@/lib/designation-master-client";
import {
  DEFAULT_CONTRACTOR_SEEDS,
  DEFAULT_EMPLOYEE_TYPE_SEEDS,
  DEFAULT_LOCATION_SEEDS,
  DEFAULT_OVERTIME_REASON_SEEDS,
  normalizeGeneralSettingsRecord,
  type GeneralSettingsRecord,
} from "@/types/general-settings";

export const GENERAL_SETTINGS_STORAGE_KEY = "shaandar-crm-general-settings";

type GeneralSettingsStore = {
  contractors: GeneralSettingsRecord[];
  employeeTypes: GeneralSettingsRecord[];
  locations: GeneralSettingsRecord[];
  overtimeReasons: GeneralSettingsRecord[];
};

type LegacyGeneralSettingsStore = Partial<
  GeneralSettingsStore & { departments?: GeneralSettingsRecord[]; machines?: GeneralSettingsRecord[] }
>;

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
    locations: createSeedRecords(DEFAULT_LOCATION_SEEDS, "location"),
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
    return {
      contractors: normalizeRecordList(parsed.contractors).length
        ? normalizeRecordList(parsed.contractors)
        : defaults.contractors,
      employeeTypes: normalizeRecordList(parsed.employeeTypes).length
        ? normalizeRecordList(parsed.employeeTypes)
        : defaults.employeeTypes,
      locations: normalizeRecordList(parsed.locations).length
        ? normalizeRecordList(parsed.locations)
        : defaults.locations,
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

type SubMasterKey = keyof GeneralSettingsStore | "departments" | "designations";

function toSelectOptions(records: GeneralSettingsRecord[]) {
  return records.map((record) => ({ value: record.name, label: record.name }));
}

export function useGeneralSettings() {
  const [store, setStore] = useState<GeneralSettingsStore>(defaultStore());
  const [departments, setDepartments] = useState<GeneralSettingsRecord[]>([]);
  const [designations, setDesignations] = useState<GeneralSettingsRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reloadDepartments = useCallback(async () => {
    const serverDepartments = await fetchDepartmentsFromServer();
    if (serverDepartments !== null) {
      setDepartments(serverDepartments);
    }
  }, []);

  const reloadDesignations = useCallback(async () => {
    const serverDesignations = await fetchDesignationsFromServer();
    if (serverDesignations !== null) {
      setDesignations(serverDesignations);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const loaded = readStore();
      setStore(loaded);
      if (typeof window !== "undefined" && !window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY)) {
        writeStore(loaded);
      }
      await Promise.all([reloadDepartments(), reloadDesignations()]);
      setIsReady(true);
    };

    void load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === GENERAL_SETTINGS_STORAGE_KEY) {
        setStore(readStore());
      }
    };
    const onDepartmentRefresh = () => {
      void reloadDepartments();
    };
    const onDesignationRefresh = () => {
      void reloadDesignations();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(DEPARTMENT_MASTER_REFRESH_EVENT, onDepartmentRefresh);
    window.addEventListener(DESIGNATION_MASTER_REFRESH_EVENT, onDesignationRefresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DEPARTMENT_MASTER_REFRESH_EVENT, onDepartmentRefresh);
      window.removeEventListener(DESIGNATION_MASTER_REFRESH_EVENT, onDesignationRefresh);
    };
  }, [reloadDepartments, reloadDesignations]);

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
    () => toSelectOptions(departments),
    [departments]
  );

  const designationOptions = useMemo(
    () => toSelectOptions(designations),
    [designations]
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
    () => departments.map((row) => row.name),
    [departments]
  );

  const designationNames = useMemo(
    () => designations.map((row) => row.name),
    [designations]
  );

  const locationOptions = useMemo(
    () => toSelectOptions(store.locations),
    [store.locations]
  );

  const locationNames = useMemo(
    () => store.locations.map((row) => row.name),
    [store.locations]
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
    async (key: SubMasterKey, name: string): Promise<void> => {
      if (key === "departments") {
        const result = await upsertDepartmentOnServer(name);
        if (result.ok) {
          setDepartments(result.departments);
        }
        return;
      }

      if (key === "designations") {
        const result = await upsertDesignationOnServer(name);
        if (result.ok) {
          setDesignations(result.designations);
        }
        return;
      }

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
        [key]: [record, ...(current[key as keyof GeneralSettingsStore] ?? [])],
      });
    },
    [persist]
  );

  const updateRecord = useCallback(
    async (key: SubMasterKey, id: string, name: string): Promise<void> => {
      if (key === "departments") {
        const existing = departments.find((row) => row.id === id);
        if (!existing) return;
        await deleteDepartmentOnServer(id);
        const result = await upsertDepartmentOnServer(name);
        if (result.ok) {
          setDepartments(result.departments);
        }
        return;
      }

      if (key === "designations") {
        const existing = designations.find((row) => row.id === id);
        if (!existing) return;
        await deleteDesignationOnServer(id);
        const result = await upsertDesignationOnServer(name);
        if (result.ok) {
          setDesignations(result.designations);
        }
        return;
      }

      const current = readStore();
      persist({
        ...current,
        [key]: current[key as keyof GeneralSettingsStore].map((row) =>
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
    [departments, designations, persist]
  );

  const removeRecord = useCallback(
    async (key: SubMasterKey, id: string): Promise<void> => {
      if (key === "departments") {
        const result = await deleteDepartmentOnServer(id);
        if (result.ok) {
          setDepartments(result.departments);
        }
        return;
      }

      if (key === "designations") {
        const result = await deleteDesignationOnServer(id);
        if (result.ok) {
          setDesignations(result.designations);
        }
        return;
      }

      const current = readStore();
      persist({
        ...current,
        [key]: current[key as keyof GeneralSettingsStore].filter((row) => row.id !== id),
      });
    },
    [persist]
  );

  return {
    contractors: store.contractors,
    employeeTypes: store.employeeTypes,
    departments,
    designations,
    locations: store.locations,
    overtimeReasons: store.overtimeReasons,
    contractorOptions,
    employeeTypeOptions,
    departmentOptions,
    designationOptions,
    locationOptions,
    overtimeReasonOptions,
    contractorNames,
    employeeTypeNames,
    departmentNames,
    designationNames,
    locationNames,
    overtimeReasonNames,
    machines: departments,
    machineOptions: departmentOptions,
    machineNames: departmentNames,
    isReady,
    addRecord,
    updateRecord,
    removeRecord,
    reloadDepartments,
    reloadDesignations,
  };
}
