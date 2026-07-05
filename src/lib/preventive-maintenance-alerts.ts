import type { MaintenanceComponentLine } from "@/types/preventive-maintenance";

export type PreventiveAlert = {
  componentId: string;
  componentName: string;
  targetName: string;
  daysUntilDue: number;
  dueDate: string;
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function computeDueDate(lastReplacedDate: string, lifespanMonths: number): Date | null {
  if (!lastReplacedDate.trim() || lifespanMonths <= 0) return null;
  const base = new Date(lastReplacedDate);
  if (Number.isNaN(base.getTime())) return null;
  return addMonths(base, lifespanMonths);
}

export function daysUntilComponentDue(
  component: Pick<MaintenanceComponentLine, "lastReplacedDate" | "lifespanMonths">,
  today: Date = new Date()
): number | null {
  const dueDate = computeDueDate(component.lastReplacedDate, component.lifespanMonths);
  if (!dueDate) return null;
  const todayStart = new Date(today.toISOString().slice(0, 10));
  return daysBetween(todayStart, dueDate);
}

/** Alert window: exactly 7 to 10 days before scheduled lifespan expires. */
export function isWithinPreventiveAlertWindow(daysUntilDue: number): boolean {
  return daysUntilDue >= 7 && daysUntilDue <= 10;
}

export function buildPreventiveAlerts(
  targetName: string,
  components: MaintenanceComponentLine[],
  today: Date = new Date()
): PreventiveAlert[] {
  const alerts: PreventiveAlert[] = [];

  for (const component of components) {
    const daysUntilDue = daysUntilComponentDue(component, today);
    if (daysUntilDue == null || !isWithinPreventiveAlertWindow(daysUntilDue)) continue;

    const dueDate = computeDueDate(component.lastReplacedDate, component.lifespanMonths);
    alerts.push({
      componentId: component.id,
      componentName: component.componentName,
      targetName,
      daysUntilDue,
      dueDate: dueDate?.toISOString().slice(0, 10) ?? "",
    });
  }

  return alerts;
}
