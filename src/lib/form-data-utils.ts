import type { EmployeeFormData } from "@/types/employee-form";
import { ALL_DOCUMENT_KEYS } from "@/lib/employee-form-utils";

export function getFormDataFile(
  value: FormDataEntryValue | null
): File | null {
  if (!value || typeof value === "string") {
    return null;
  }

  return value as File;
}

export function buildEmployeePayloadJson(
  formData: EmployeeFormData
): string {
  const payload = {
    basicInformation: formData.basicInformation,
    workAssignment: formData.workAssignment,
    familyMembers: formData.familyMembers,
    documentNumbers: formData.documentNumbers,
    bankAndSalary: formData.bankAndSalary,
    existingDocumentPaths: formData.existingDocumentPaths,
  };

  return JSON.stringify(payload);
}

export function extractDocumentFiles(
  formData: FormData
): EmployeeFormData["documents"] {
  const documents = {} as EmployeeFormData["documents"];

  for (const key of ALL_DOCUMENT_KEYS) {
    documents[key] = getFormDataFile(formData.get(key));
  }

  return documents;
}

export function mergeDocumentPaths(
  existing: EmployeeFormData["existingDocumentPaths"],
  uploaded: Record<string, string | null | undefined>
): EmployeeFormData["existingDocumentPaths"] {
  const merged = { ...existing };

  for (const [key, path] of Object.entries(uploaded)) {
    if (path) {
      merged[key as keyof typeof merged] = path;
    }
  }

  return merged;
}
