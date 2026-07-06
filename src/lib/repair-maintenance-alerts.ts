import type { PreventiveMaintenanceCycle } from "@/types/repair-maintenance-log";
import type {
  MachineRepairLogRow,
  VehicleRepairLogRow,
} from "@/types/repair-maintenance-log";
import { PREVENTIVE_CYCLE_OPTIONS } from "@/types/repair-maintenance-log";

/** Proactive alert fires exactly 10–15 days before scheduled service. */
export const PREVENTIVE_ALERT_MIN_DAYS = 10;
export const PREVENTIVE_ALERT_MAX_DAYS = 15;

export type MaintenanceAlertStatus = {
  daysUntilDue: number;
  nextMaintenanceDate: string;
  isUpcomingAlert: boolean;
};

export type MaintenanceDashboardAlert = {
  id: string;
  assetType: "machine" | "vehicle";
  assetLabel: string;
  nextMaintenanceDate: string;
  daysUntilDue: number;
  preventiveCycle: PreventiveMaintenanceCycle;
};

function addMonths(base: Date, months: number): Date {
  const result = new Date(base);
  result.setMonth(result.getMonth() + months);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function cycleToMonths(cycle: PreventiveMaintenanceCycle): number {
  return (
    PREVENTIVE_CYCLE_OPTIONS.find((option) => option.value === cycle)?.months ??
    (cycle === "yearly" ? 12 : 6)
  );
}

export function computeNextMaintenanceDateFromCycle(
  loggedAt: string,
  cycle: PreventiveMaintenanceCycle
): string {
  const months = cycleToMonths(cycle);
  const serviceBase = new Date(loggedAt);
  if (Number.isNaN(serviceBase.getTime())) {
    return addMonths(new Date(), months).toISOString().slice(0, 10);
  }
  return addMonths(serviceBase, months).toISOString().slice(0, 10);
}

export function isWithinPreventiveAlertWindow(daysUntilDue: number): boolean {
  return (
    daysUntilDue >= PREVENTIVE_ALERT_MIN_DAYS &&
    daysUntilDue <= PREVENTIVE_ALERT_MAX_DAYS
  );
}

export function resolveMaintenanceAlertStatus(
  nextMaintenanceDate: string,
  today: Date = new Date()
): MaintenanceAlertStatus | null {
  if (!nextMaintenanceDate.trim()) return null;

  const dueDate = new Date(nextMaintenanceDate);
  if (Number.isNaN(dueDate.getTime())) return null;

  const todayStart = new Date(today.toISOString().slice(0, 10));
  const daysUntilDue = daysBetween(todayStart, dueDate);

  return {
    daysUntilDue,
    nextMaintenanceDate: nextMaintenanceDate.slice(0, 10),
    isUpcomingAlert: isWithinPreventiveAlertWindow(daysUntilDue),
  };
}

export function formatMaintenanceAlertLabel(daysUntilDue: number): string {
  if (daysUntilDue === PREVENTIVE_ALERT_MIN_DAYS) {
    return `Preventive Service Due in ${daysUntilDue} Days`;
  }
  if (daysUntilDue <= PREVENTIVE_ALERT_MAX_DAYS) {
    return `Preventive Service Due in ${daysUntilDue} Days (10–15 Day Alert)`;
  }
  return `Next Service in ${daysUntilDue} Days`;
}

function mapLogToDashboardAlert(
  id: string,
  assetType: "machine" | "vehicle",
  assetLabel: string,
  nextMaintenanceDate: string,
  preventiveCycle: PreventiveMaintenanceCycle
): MaintenanceDashboardAlert | null {
  const status = resolveMaintenanceAlertStatus(nextMaintenanceDate);
  if (!status?.isUpcomingAlert) return null;
  return {
    id,
    assetType,
    assetLabel,
    nextMaintenanceDate: status.nextMaintenanceDate,
    daysUntilDue: status.daysUntilDue,
    preventiveCycle,
  };
}

export function collectDashboardMaintenanceAlerts(
  machineLogs: MachineRepairLogRow[],
  vehicleLogs: VehicleRepairLogRow[]
): MaintenanceDashboardAlert[] {
  const alerts: MaintenanceDashboardAlert[] = [];
  const latestMachineByKey = new Map<string, MachineRepairLogRow>();
  const latestVehicleByKey = new Map<string, VehicleRepairLogRow>();

  for (const row of machineLogs) {
    const key = row.machineId.trim() || row.machineIdName.trim();
    if (!key || latestMachineByKey.has(key)) continue;
    latestMachineByKey.set(key, row);
  }

  for (const row of vehicleLogs) {
    const key = row.vehicleId.trim() || row.vehicleNumber.trim();
    if (!key || latestVehicleByKey.has(key)) continue;
    latestVehicleByKey.set(key, row);
  }

  for (const row of latestMachineByKey.values()) {
    const alert = mapLogToDashboardAlert(
      row.id,
      "machine",
      row.machineIdName,
      row.nextMaintenanceDate,
      row.preventiveCycle
    );
    if (alert) alerts.push(alert);
  }

  for (const row of latestVehicleByKey.values()) {
    const alert = mapLogToDashboardAlert(
      row.id,
      "vehicle",
      row.vehicleNumber,
      row.nextMaintenanceDate,
      row.preventiveCycle
    );
    if (alert) alerts.push(alert);
  }

  return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export function countUpcomingMaintenanceAlerts(
  machineLogs: MachineRepairLogRow[],
  vehicleLogs: VehicleRepairLogRow[]
): number {
  return collectDashboardMaintenanceAlerts(machineLogs, vehicleLogs).length;
}
