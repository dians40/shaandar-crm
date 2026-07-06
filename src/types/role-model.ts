export type RoleModelRecord = {
  id: string;
  role: string;
  createdAt: string;
};

export type RoleModelFormState = {
  role: string;
};

export const EMPTY_ROLE_MODEL_FORM: RoleModelFormState = {
  role: "",
};

export function validateRoleModelForm(form: RoleModelFormState): string | null {
  if (!form.role.trim()) {
    return "Select a role designation to save.";
  }
  return null;
}
