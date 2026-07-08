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

export type GeneralSettingsSubMaster =
  | "contractors"
  | "employee-types"
  | "departments"
  | "designations"
  | "locations"
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
    description: "Dynamic department registry auto-synced from attendance labour import — add or remove entries manually.",
  },
  {
    id: "designations",
    label: "Designation",
    description: "Manage job designations used in attendance, employee records, and master list filters.",
  },
  {
    id: "locations",
    label: "Location Master",
    description: "Corporate work locations used for overtime substitution and floor assignment references.",
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

export const DEFAULT_OVERTIME_REASON_SEEDS = [
  "Extra Power",
  "Short of Employee",
  "Other Reasons",
];

export const DEFAULT_LOCATION_SEEDS = [
  "Main Production Floor",
  "Packaging Unit",
  "Warehouse Bay",
  "Admin Block",
];

/** Core department names seeded into the Department master on first load (serial order preserved). */
export const DEFAULT_DEPARTMENT_SEEDS = [
  "CHAIR MACHINE DAY",
  "CHAIR MACHINE NIGHT",
  "DANA MACHINE DAY",
  "DANA MACHINE NIGHT",
  "DRIVER",
  "ELECTRICAL MAN",
  "EXTRA WORK",
  "GRINDING MAN DAY",
  "GRINDING MAN NIGHT",
  "HIKON MACHINE",
  "KOL PAT DAY",
  "LUMPS GRINDING NIGHT",
  "MASCORT MACHINE DAY",
  "MIXING COLOR DAY",
  "MIXING COLOR NIGHT",
  "OPERATOR CHAIR MACHINE",
  "PACKING CARTOON",
  "PAPER CUP MACHINE",
  "PRINTING MACHINE NIGHT",
  "SECURITY NIGHT",
  "SILAE BAG",
  "STAFF",
  "SUPERVISOR",
  "TFM OPERATOR AND HELPER",
  "UNLOADING",
] as const;

/** Core designation names seeded into the Designation master on first load. */
export const DEFAULT_DESIGNATION_SEEDS = [
  "Operator",
  "Supervisor",
  "Manager",
  "Helper",
  "Accountant",
  "Technician",
  "HR Executive",
  "Security Guard",
  "Driver",
  "Other",
];
