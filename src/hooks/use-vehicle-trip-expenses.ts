"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeVehicleTripExpenseRecord,
  type VehicleTripExpenseFormState,
  type VehicleTripExpenseRecord,
} from "@/types/vehicle-trip-expense";

const STORAGE_KEY = "shaandar-crm-vehicle-trip-expenses";

function readTrips(): VehicleTripExpenseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<VehicleTripExpenseRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<VehicleTripExpenseRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeVehicleTripExpenseRecord(row));
  } catch {
    return [];
  }
}

function writeTrips(records: VehicleTripExpenseRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useVehicleTripExpenses() {
  const [records, setRecords] = useState<VehicleTripExpenseRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setRecords(readTrips());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: VehicleTripExpenseRecord[]) => {
    setRecords(next);
    writeTrips(next);
  }, []);

  const addTrip = useCallback(
    (input: VehicleTripExpenseFormState) => {
      const now = new Date().toISOString();
      const record = normalizeVehicleTripExpenseRecord({
        ...input,
        id: `vtrip-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readTrips()]);
      return record;
    },
    [persist]
  );

  const updateTrip = useCallback(
    (id: string, input: VehicleTripExpenseFormState) => {
      const next = readTrips().map((row) =>
        row.id === id
          ? normalizeVehicleTripExpenseRecord({
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

  const patchTrip = useCallback(
    (id: string, patch: Partial<VehicleTripExpenseRecord>) => {
      const next = readTrips().map((row) =>
        row.id === id
          ? normalizeVehicleTripExpenseRecord({
              ...row,
              ...patch,
              id: row.id,
              updatedAt: new Date().toISOString(),
            })
          : row
      );
      persist(next);
    },
    [persist]
  );

  const removeTrip = useCallback(
    (id: string) => {
      persist(readTrips().filter((row) => row.id !== id));
    },
    [persist]
  );

  return { records, isReady, addTrip, updateTrip, patchTrip, removeTrip };
}
