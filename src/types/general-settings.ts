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

export type GeneralSettingsSubMaster = "contractors" | "employee-types" | "machines";

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
    id: "machines",
    label: "Machine Master",
    description: "Register factory machines for overtime and production tracking.",
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

export const DEFAULT_MACHINE_SEEDS = [
  "Machine 1",
  "Machine A",
  "Machine B",
  "Machine C",
  "Mixer B",
];
