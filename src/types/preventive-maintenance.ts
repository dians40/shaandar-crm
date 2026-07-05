export type MaintenanceTargetType = "machine" | "vehicle";

export type MaintenanceComponentLine = {
  id: string;
  componentName: string;
  lifespanMonths: number;
  lastReplacedDate: string;
};

export type PreventiveMaintenanceRule = {
  id: string;
  targetType: MaintenanceTargetType;
  targetId: string;
  targetName: string;
  components: MaintenanceComponentLine[];
  createdAt: string;
  updatedAt: string;
};

export type PreventiveMaintenanceFormState = Omit<
  PreventiveMaintenanceRule,
  "id" | "createdAt" | "updatedAt"
>;

export const LIFESPAN_DURATION_OPTIONS = [
  { value: "1", label: "1 Month" },
  { value: "2", label: "2 Months" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
] as const;

export function createEmptyComponentLine(): MaintenanceComponentLine {
  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    componentName: "",
    lifespanMonths: 6,
    lastReplacedDate: new Date().toISOString().slice(0, 10),
  };
}

export function emptyPreventiveMaintenanceForm(): PreventiveMaintenanceFormState {
  return {
    targetType: "machine",
    targetId: "",
    targetName: "",
    components: [createEmptyComponentLine()],
  };
}

function normalizeComponentLine(line: Partial<MaintenanceComponentLine>): MaintenanceComponentLine {
  return {
    id: line.id ?? createEmptyComponentLine().id,
    componentName: line.componentName ?? "",
    lifespanMonths: Number(line.lifespanMonths) || 6,
    lastReplacedDate: line.lastReplacedDate ?? new Date().toISOString().slice(0, 10),
  };
}

export function normalizePreventiveMaintenanceRule(
  row: Partial<PreventiveMaintenanceRule> & Pick<PreventiveMaintenanceRule, "id">
): PreventiveMaintenanceRule {
  return {
    id: row.id,
    targetType: row.targetType === "vehicle" ? "vehicle" : "machine",
    targetId: row.targetId ?? "",
    targetName: row.targetName ?? "",
    components: Array.isArray(row.components)
      ? row.components.map(normalizeComponentLine)
      : [createEmptyComponentLine()],
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validatePreventiveMaintenanceForm(
  form: PreventiveMaintenanceFormState
): string | null {
  if (!form.targetId) return "Target machine or vehicle is required.";
  const validComponents = form.components.filter(
    (row) => row.componentName.trim() && row.lifespanMonths > 0 && row.lastReplacedDate
  );
  if (validComponents.length === 0) {
    return "Add at least one component with name, lifespan, and last replaced date.";
  }
  return null;
}
