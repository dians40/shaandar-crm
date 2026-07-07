export type GeneralSettingsRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GeneralSettingsFormState = {
  name: string;
};

export const EMPTY_GENERAL_SETTINGS_FORM: GeneralSettingsFormState = {
  name: "",
};

export function normalizeGeneralSettingsRecord(
  row: Partial<GeneralSettingsRecord> & Pick<GeneralSettingsRecord, "id">
): GeneralSettingsRecord {
  return {
    id: row.id,
    name: row.name ?? "",
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateGeneralSettingsName(
  name: string,
  existingNames: string[],
  editingName?: string
): string | null {
  if (!name.trim()) return "Name is required.";

  const duplicate = existingNames.some(
    (entry) =>
      entry.toLowerCase() === name.trim().toLowerCase() &&
      entry.toLowerCase() !== (editingName ?? "").toLowerCase()
  );
  if (duplicate) return "This name already exists.";

  return null;
}

import { DEFAULT_DEPARTMENT_OPTIONS } from "@/lib/attendance-department-options";

export type GeneralSettingsSubMaster =
  | "contractors"
  | "employee-types"
  | "departments"
  | "overtime-reasons";

export const GENERAL_SETTINGS_SUB_TABS: Array<{
  id: GeneralSettingsSubMaster;
  label: string;
  description: string;
}> = [
  {
    id: "contractors",
    label: "Contractor Register",
    description: "Manage contractor names for employee and group assignments.",
  },
  {
    id: "employee-types",
    label: "Employee Type Master",
    description: "Manage employee classification labels used in Employee Master.",
  },
  {
    id: "departments",
    label: "Department",
    description: "Manage department labels synced with labour import and attendance workflow dropdowns.",
  },
  {
    id: "overtime-reasons",
    label: "Overtime Reasons",
    description: "Standard overtime justification labels for the day-by-day OT tracker.",
  },
];

export const DEFAULT_CONTRACTOR_SEEDS = [
  "Contractor 1",
  "Contractor 2",
  "Contractor 3",
  "Contractor 4",
];

export const DEFAULT_EMPLOYEE_TYPE_SEEDS = [
  "Direct Roll / Employee",
  "Contractor Worker",
  "Regular",
  "Contractor",
  "Temporary",
];

/** Same defaults as labour import / attendance bulk import department dropdown. */
export const DEFAULT_DEPARTMENT_SEEDS = [...DEFAULT_DEPARTMENT_OPTIONS];

export const DEFAULT_OVERTIME_REASON_SEEDS = [
  "Extra Power",
  "Short of Employee",
  "Other Reasons",
];
