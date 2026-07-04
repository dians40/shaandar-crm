"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeVehicleMasterRecord,
  type VehicleMasterRecord,
} from "@/types/vehicle-master";

const STORAGE_KEY = "shaandar-crm-vehicles-master";

function readVehicles(): VehicleMasterRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<VehicleMasterRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Partial<VehicleMasterRecord> & { id: string } =>
        Boolean(row?.id)
      )
      .map((row) => normalizeVehicleMasterRecord(row));
  } catch {
    return [];
  }
}

function writeVehicles(records: VehicleMasterRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useVehiclesMaster() {
  const [vehicles, setVehicles] = useState<VehicleMasterRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setVehicles(readVehicles());
    setIsReady(true);
  }, []);

  const persist = useCallback((next: VehicleMasterRecord[]) => {
    setVehicles(next);
    writeVehicles(next);
  }, []);

  const addVehicle = useCallback(
    (input: Omit<VehicleMasterRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const record = normalizeVehicleMasterRecord({
        ...input,
        id: `vehicle-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      });
      persist([record, ...readVehicles()]);
      return record;
    },
    [persist]
  );

  const updateVehicle = useCallback(
    (id: string, input: Omit<VehicleMasterRecord, "id" | "createdAt" | "updatedAt">) => {
      const next = readVehicles().map((row) =>
        row.id === id
          ? normalizeVehicleMasterRecord({
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

  const removeVehicle = useCallback(
    (id: string) => {
      persist(readVehicles().filter((row) => row.id !== id));
    },
    [persist]
  );

  return { vehicles, isReady, addVehicle, updateVehicle, removeVehicle };
}
