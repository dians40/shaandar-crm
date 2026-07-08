import type {
  DocumentKey,
  DocumentNumberKey,
  EmployeeFormData,
  FileMeta,
} from "@/types/employee-form";
import {
  EMPTY_DOCUMENT_NUMBERS,
  EMPTY_DOCUMENTS,
  INITIAL_CONTRACT_PACKING,
  INITIAL_EMPLOYEE_FORM,
} from "@/types/employee-form";

export function calculateAgeFromDob(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;

  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function fileToMeta(file: File | null): FileMeta | null {
  if (!file) return null;

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

export function createFamilyMemberId(): string {
  return `family-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DOCUMENT_LABELS: Record<
  DocumentKey,
  { label: string; hint: string }
> = {
  profilePhoto: {
    label: "Profile Photo",
    hint: "Upload employee profile photo (JPG, PNG)",
  },
  aadhar: {
    label: "Aadhar Card",
    hint: "Upload Aadhar document only — no plain-text number stored",
  },
  pan: {
    label: "PAN Card",
    hint: "Upload PAN card document",
  },
  esi: {
    label: "ESI Document",
    hint: "Upload ESI registration or card copy",
  },
  pf: {
    label: "PF Document",
    hint: "Upload PF/UAN related document",
  },
  drivingLicense: {
    label: "Driving License",
    hint: "Upload driving license copy",
  },
  rationCard: {
    label: "Ration Card",
    hint: "Upload ration card copy",
  },
  voterId: {
    label: "Voter ID Card",
    hint: "Upload voter ID document",
  },
  otherDocuments: {
    label: "Other Documents",
    hint: "Upload any additional supporting document",
  },
};

export const DOCUMENT_NUMBER_LABELS: Record<DocumentNumberKey, string> = {
  pan: "PAN Number",
  pf: "PF Number",
  esi: "ESI Number",
  drivingLicense: "Driving License Number",
  rationCard: "Ration Card Number",
  voterId: "Voter ID Number",
};

/** Document upload keys shown in Documents section (excludes profile photo) */
export const DOCUMENT_UPLOAD_KEYS = (
  Object.keys(DOCUMENT_LABELS) as DocumentKey[]
).filter((key) => key !== "profilePhoto");

export const ALL_DOCUMENT_KEYS = Object.keys(DOCUMENT_LABELS) as DocumentKey[];

/** Merge partial API or legacy payloads with the canonical empty form shape. */
export function normalizeEmployeeFormData(
  data: Partial<EmployeeFormData> | null | undefined
): EmployeeFormData {
  const source = data ?? {};

  return {
    basicInformation: {
      ...INITIAL_EMPLOYEE_FORM.basicInformation,
      ...(source.basicInformation ?? {}),
    },
    workAssignment: {
      ...INITIAL_EMPLOYEE_FORM.workAssignment,
      ...(source.workAssignment ?? {}),
      machineAssignment: source.workAssignment?.machineAssignment ?? "",
    },
    familyMembers: Array.isArray(source.familyMembers) ? source.familyMembers : [],
    documents: { ...EMPTY_DOCUMENTS, ...(source.documents ?? {}) },
    documentNumbers: {
      ...EMPTY_DOCUMENT_NUMBERS,
      ...(source.documentNumbers ?? {}),
    },
    existingDocumentPaths: { ...(source.existingDocumentPaths ?? {}) },
    bankAndSalary: {
      ...INITIAL_EMPLOYEE_FORM.bankAndSalary,
      ...(source.bankAndSalary ?? {}),
      firmHeadProfile: source.bankAndSalary?.firmHeadProfile ?? "",
      pfFirm: source.bankAndSalary?.pfFirm ?? "",
      contractPacking: {
        ...INITIAL_CONTRACT_PACKING,
        ...(source.bankAndSalary?.contractPacking ?? {}),
      },
    },
  };
}

export const DOCUMENT_KEYS_WITH_NUMBER: DocumentNumberKey[] = [
  "pan",
  "pf",
  "esi",
  "drivingLicense",
  "rationCard",
  "voterId",
];
