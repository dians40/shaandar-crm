export type SalaryComponentType = "earning" | "deduction";

export type SalaryComponentRecord = {
  id: string;
  componentName: string;
  componentType: SalaryComponentType;
  isSystemSeed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SalaryComponentFormState = Omit<
  SalaryComponentRecord,
  "id" | "isSystemSeed" | "createdAt" | "updatedAt"
>;

export const EMPTY_SALARY_COMPONENT_FORM: SalaryComponentFormState = {
  componentName: "",
  componentType: "earning",
};

export function normalizeSalaryComponentRecord(
  row: Partial<SalaryComponentRecord> & Pick<SalaryComponentRecord, "id">
): SalaryComponentRecord {
  return {
    id: row.id,
    componentName: row.componentName ?? "",
    componentType: row.componentType === "deduction" ? "deduction" : "earning",
    isSystemSeed: Boolean(row.isSystemSeed),
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateSalaryComponentForm(
  form: SalaryComponentFormState
): string | null {
  if (!form.componentName.trim()) return "Component name is required.";
  return null;
}
