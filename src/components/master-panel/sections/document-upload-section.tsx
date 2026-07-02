"use client";

import { FileInputField, TextInput } from "@/components/forms/form-fields";
import {
  DOCUMENT_LABELS,
  DOCUMENT_KEYS_WITH_NUMBER,
  DOCUMENT_NUMBER_LABELS,
  DOCUMENT_UPLOAD_KEYS,
} from "@/lib/employee-form-utils";
import type {
  DocumentFiles,
  DocumentNumberKey,
  DocumentNumbers,
  DocumentPaths,
} from "@/types/employee-form";

type Props = {
  documents: DocumentFiles;
  documentNumbers: DocumentNumbers;
  existingDocumentPaths: DocumentPaths;
  onDocumentsChange: (documents: DocumentFiles) => void;
  onDocumentNumbersChange: (numbers: DocumentNumbers) => void;
};

function pathLabel(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export default function DocumentUploadSection({
  documents,
  documentNumbers,
  existingDocumentPaths,
  onDocumentsChange,
  onDocumentNumbersChange,
}: Props) {
  const handleFileChange = (key: keyof DocumentFiles, file: File | null) => {
    onDocumentsChange({ ...documents, [key]: file });
  };

  const handleNumberChange = (key: DocumentNumberKey, value: string) => {
    onDocumentNumbersChange({ ...documentNumbers, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-corporate-text">
          Document Upload & ID Numbers
        </h2>
        <p className="mt-1 text-sm text-corporate-muted">
          Upload documents and enter ID numbers. Aadhaar is file-only — no plain-text number
          is stored.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {DOCUMENT_UPLOAD_KEYS.map((key) => {
          const config = DOCUMENT_LABELS[key];
          const file = documents[key];
          const existing = existingDocumentPaths[key];
          const displayName =
            file?.name ?? (existing ? `Uploaded: ${pathLabel(existing)}` : null);
          const hasNumberField = DOCUMENT_KEYS_WITH_NUMBER.includes(
            key as DocumentNumberKey
          );

          return (
            <div
              key={key}
              className="space-y-4 rounded-xl border border-corporate-border bg-corporate-bg/40 p-4"
            >
              <FileInputField
                label={config.label}
                hint={config.hint}
                fileName={displayName}
                onFileChange={(selected) => handleFileChange(key, selected)}
              />
              {hasNumberField && (
                <TextInput
                  label={DOCUMENT_NUMBER_LABELS[key as DocumentNumberKey]}
                  name={`${key}Number`}
                  placeholder={`Enter ${DOCUMENT_NUMBER_LABELS[key as DocumentNumberKey].toLowerCase()}`}
                  value={documentNumbers[key as DocumentNumberKey]}
                  onChange={(e) =>
                    handleNumberChange(key as DocumentNumberKey, e.target.value)
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
