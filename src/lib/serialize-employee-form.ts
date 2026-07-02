import type {
  DocumentFiles,
  Documents,
  EmployeeFormData,
} from "@/types/employee-form";
import { fileToMeta } from "./employee-form-utils";

export type EmployeeFormPayload = Omit<EmployeeFormData, "documents"> & {
  documents: Documents;
  submittedAt: string;
};

export function serializeEmployeeForm(
  formData: EmployeeFormData
): EmployeeFormPayload {
  const documents = (Object.keys(formData.documents) as (keyof DocumentFiles)[]).reduce(
    (acc, key) => {
      acc[key] = fileToMeta(formData.documents[key]);
      return acc;
    },
    {} as Documents
  );

  return {
    ...formData,
    documents,
    submittedAt: new Date().toISOString(),
  };
}
