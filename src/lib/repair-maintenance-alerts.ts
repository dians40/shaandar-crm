import type { PreventiveMaintenanceRule } from "@/types/preventive-maintenance";
import { computeDueDate } from "@/lib/preventive-maintenance-alerts";

export const REPAIR_MAINTENANCE_ALERT_WINDOW_DAYS = 15;
export const DEFAULT_NEXT_SERVICE_DAYS = 90;

export type MaintenanceAlertStatus = {
  daysUntilDue: number;
  nextMaintenanceDate: string;
  isUpcomingAlert: boolean;
};

function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function computeNextMaintenanceDate(
  loggedAt: string,
  targetType: "machine" | "vehicle",
  targetId: string,
  targetName: string,
  preventiveRules: PreventiveMaintenanceRule[]
): string {
  const matchingRule = preventiveRules.find(
    (rule) =>
      rule.targetType === targetType &&
      (rule.targetId === targetId || rule.targetName.trim() === targetName.trim())
  );

  if (matchingRule?.components.length) {
    let earliestDue: Date | null = null;

    for (const component of matchingRule.components) {
      const dueDate = computeDueDate(component.lastReplacedDate, component.lifespanMonths);
      if (!dueDate) continue;
      if (!earliestDue || dueDate < earliestDue) {
        earliestDue = dueDate;
      }
    }

    if (earliestDue) {
      return earliestDue.toISOString().slice(0, 10);
    }
  }

  const serviceBase = new Date(loggedAt);
  if (Number.isNaN(serviceBase.getTime())) {
    return addDays(new Date(), DEFAULT_NEXT_SERVICE_DAYS).toISOString().slice(0, 10);
  }

  return addDays(serviceBase, DEFAULT_NEXT_SERVICE_DAYS).toISOString().slice(0, 10);
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
    isUpcomingAlert:
      daysUntilDue >= 0 && daysUntilDue <= REPAIR_MAINTENANCE_ALERT_WINDOW_DAYS,
  };
}

export function formatMaintenanceAlertLabel(daysUntilDue: number): string {
  if (daysUntilDue === 0) {
    return "Upcoming Maintenance - Due Today";
  }
  if (daysUntilDue <= REPAIR_MAINTENANCE_ALERT_WINDOW_DAYS) {
    return "Upcoming Maintenance - 15 Day Alert";
  }
  return `Upcoming Maintenance - ${daysUntilDue} Day Alert`;
}
