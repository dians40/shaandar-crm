import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentKey, EmployeeFormData } from "@/types/employee-form";
import { ALL_DOCUMENT_KEYS } from "@/lib/employee-form-utils";
import {
  EMPLOYEE_DOCUMENT_BUCKET,
  type DocumentPaths,
} from "@/types/employee-db";

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

export async function uploadEmployeeDocuments(
  supabase: SupabaseClient,
  employeeId: string,
  documents: EmployeeFormData["documents"],
  existingPaths: DocumentPaths = {}
): Promise<DocumentPaths> {
  const paths: DocumentPaths = { ...existingPaths };

  for (const key of ALL_DOCUMENT_KEYS) {
    const file = documents[key as DocumentKey];
    if (!file) {
      continue;
    }

    const ext = getFileExtension(file.name);
    const storagePath = `${employeeId}/${key}.${ext}`;

    const { error } = await supabase.storage
      .from(EMPLOYEE_DOCUMENT_BUCKET)
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type || undefined,
      });

    if (error) {
      throw new Error(`Failed to upload ${key}: ${error.message}`);
    }

    paths[key as DocumentKey] = `${EMPLOYEE_DOCUMENT_BUCKET}/${storagePath}`;
  }

  return paths;
}
