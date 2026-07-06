import type {
  MachineRepairLogRow,
  VehicleRepairLogRow,
} from "@/types/repair-maintenance-log";

const MACHINE_LOGS_KEY = "shaandar-crm-machine-repair-logs";
const VEHICLE_LOGS_KEY = "shaandar-crm-vehicle-repair-logs";

function readRows<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRows<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

export function readMachineRepairLogs(): MachineRepairLogRow[] {
  return readRows<MachineRepairLogRow>(MACHINE_LOGS_KEY);
}

export function appendMachineRepairLog(row: MachineRepairLogRow): MachineRepairLogRow[] {
  const next = [row, ...readMachineRepairLogs()];
  writeRows(MACHINE_LOGS_KEY, next);
  return next;
}

export function readVehicleRepairLogs(): VehicleRepairLogRow[] {
  return readRows<VehicleRepairLogRow>(VEHICLE_LOGS_KEY);
}

export function appendVehicleRepairLog(row: VehicleRepairLogRow): VehicleRepairLogRow[] {
  const next = [row, ...readVehicleRepairLogs()];
  writeRows(VEHICLE_LOGS_KEY, next);
  return next;
}
