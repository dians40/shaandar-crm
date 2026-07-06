export type RoleModelRecord = {
  id: string;
  staffName: string;
  role: string;
  staffSource: "existing" | "new";
  employeeId: string | null;
  createdAt: string;
};

export type RoleModelFormState = {
  selectedStaffId: string;
  newStaffName: string;
  role: string;
};

export const EMPTY_ROLE_MODEL_FORM: RoleModelFormState = {
  selectedStaffId: "",
  newStaffName: "",
  role: "",
};

export function validateRoleModelForm(form: RoleModelFormState): string | null {
  const hasExisting = Boolean(form.selectedStaffId.trim());
  const hasNew = Boolean(form.newStaffName.trim());

  if (!hasExisting && !hasNew) {
    return "Select a staff member from My Staff List or enter a new staff name.";
  }
  if (!form.role.trim()) {
    return "Select a role designation for this assignment.";
  }
  return null;
}

export function resolveStaffName(
  form: RoleModelFormState,
  employeeNameById: Map<string, string>
): string {
  if (form.newStaffName.trim()) {
    return form.newStaffName.trim();
  }
  return employeeNameById.get(form.selectedStaffId) ?? "";
}
