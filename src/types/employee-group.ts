export type EmployeeGroupRecord = {
  id: string;
  groupName: string;
  contractorName: string;
  customContractorNote: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeGroupFormState = Omit<
  EmployeeGroupRecord,
  "id" | "createdAt" | "updatedAt"
>;

export const EMPTY_EMPLOYEE_GROUP_FORM: EmployeeGroupFormState = {
  groupName: "",
  contractorName: "",
  customContractorNote: "",
};

export function normalizeEmployeeGroupRecord(
  row: Partial<EmployeeGroupRecord> & Pick<EmployeeGroupRecord, "id">
): EmployeeGroupRecord {
  return {
    id: row.id,
    groupName: row.groupName ?? "",
    contractorName: row.contractorName ?? "",
    customContractorNote: row.customContractorNote ?? "",
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateEmployeeGroupForm(
  form: EmployeeGroupFormState,
  existingNames: string[],
  editingName?: string
): string | null {
  if (!form.groupName.trim()) return "Employee group name is required.";
  if (!form.contractorName.trim() && !form.customContractorNote.trim()) {
    return "Select a contractor or enter a custom contractor name.";
  }

  const duplicate = existingNames.some(
    (name) =>
      name.toLowerCase() === form.groupName.trim().toLowerCase() &&
      name.toLowerCase() !== (editingName ?? "").toLowerCase()
  );
  if (duplicate) return "An employee group with this name already exists.";

  return null;
}

export function resolveEmployeeGroupContractor(record: EmployeeGroupRecord): string {
  if (record.customContractorNote.trim()) return record.customContractorNote.trim();
  return record.contractorName;
}
