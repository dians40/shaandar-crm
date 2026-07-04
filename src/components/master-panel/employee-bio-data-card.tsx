"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Loader2,
  User,
} from "lucide-react";
import { fetchEmployee } from "@/lib/employees-api";
import { DOCUMENT_LABELS } from "@/lib/employee-form-utils";
import type { EmployeeFormData } from "@/types/employee-form";

type Props = {
  employeeId: string;
  onBack: () => void;
  onEdit: () => void;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-corporate-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-corporate-text">{value?.trim() || "—"}</dd>
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EmployeeBioDataCard({
  employeeId,
  onBack,
  onEdit,
}: Props) {
  const [employee, setEmployee] = useState<EmployeeFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetchEmployee(employeeId)
      .then(setEmployee)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load bio-data.")
      )
      .finally(() => setIsLoading(false));
  }, [employeeId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-corporate-border bg-corporate-surface p-12">
        <Loader2 className="h-8 w-8 animate-spin text-corporate-brand" />
        <p className="mt-3 text-sm text-corporate-muted">Loading bio-data...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{error ?? "Employee not found."}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to list
        </button>
      </div>
    );
  }

  const basic = employee.basicInformation;
  const photoUrl = employee.existingDocumentPaths.profilePhoto ?? null;

  const documentEntries: Array<{ label: string; value: string; uploaded: boolean }> =
    [
      {
        label: DOCUMENT_LABELS.aadhar.label,
        value: employee.existingDocumentPaths.aadhar ? "Uploaded" : "Not submitted",
        uploaded: Boolean(employee.existingDocumentPaths.aadhar),
      },
      {
        label: "PAN",
        value: employee.documentNumbers.pan || "Not provided",
        uploaded: Boolean(
          employee.existingDocumentPaths.pan || employee.documentNumbers.pan
        ),
      },
      {
        label: "ESI",
        value: employee.documentNumbers.esi || "Not provided",
        uploaded: Boolean(
          employee.existingDocumentPaths.esi || employee.documentNumbers.esi
        ),
      },
      {
        label: "PF / UAN",
        value: employee.documentNumbers.pf || "Not provided",
        uploaded: Boolean(
          employee.existingDocumentPaths.pf || employee.documentNumbers.pf
        ),
      },
      {
        label: "Driving License",
        value: employee.documentNumbers.drivingLicense || "Not provided",
        uploaded: Boolean(
          employee.existingDocumentPaths.drivingLicense ||
            employee.documentNumbers.drivingLicense
        ),
      },
      {
        label: "Ration Card",
        value: employee.documentNumbers.rationCard || "Not provided",
        uploaded: Boolean(
          employee.existingDocumentPaths.rationCard ||
            employee.documentNumbers.rationCard
        ),
      },
      {
        label: "Voter ID",
        value: employee.documentNumbers.voterId || "Not provided",
        uploaded: Boolean(
          employee.existingDocumentPaths.voterId || employee.documentNumbers.voterId
        ),
      },
    ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-corporate-border px-3 py-2 text-sm font-medium text-corporate-text hover:bg-corporate-bg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white hover:bg-corporate-brand/90"
        >
          Edit employee
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <div className="border-b border-corporate-border bg-corporate-bg/60 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
            Labor Bio-Data
          </p>
          <h2 className="mt-1 text-xl font-semibold text-corporate-text">
            {basic.firstName} {basic.lastName}
          </h2>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-xl border border-corporate-border bg-corporate-bg">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={`${basic.firstName} ${basic.lastName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-corporate-muted">
                  <User className="h-12 w-12" />
                  <span className="mt-2 text-xs">No photo</span>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-corporate-muted">Profile Photo</p>
          </div>

          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailRow label="First Name" value={basic.firstName} />
            <DetailRow label="Last Name" value={basic.lastName} />
            <DetailRow label="Date of Birth" value={formatDate(basic.dateOfBirth)} />
            <DetailRow label="Gender" value={basic.gender} />
            <DetailRow label="Father's Name" value={basic.fatherName} />
            <DetailRow label="Mobile Number" value={basic.mobileNumber} />
            <DetailRow
              label="Address"
              value={
                basic.fullAddress
                  ? `${basic.fullAddress}${basic.pinCode ? ` — ${basic.pinCode}` : ""}`
                  : undefined
              }
            />
            <DetailRow label="Employee Type" value={basic.employeeType} />
            <DetailRow label="Assigned Firm / Company" value={basic.assignedFirm} />
            <DetailRow label="Assigned Contractor" value={basic.assignedContractor} />
            <DetailRow
              label="ESI Deduction"
              value={employee.bankAndSalary.esiEnabled ? "Active" : "Inactive"}
            />
            <DetailRow
              label="Machine Assignment"
              value={employee.workAssignment.machineAssignment}
            />
          </dl>
        </div>

        <div className="border-t border-corporate-border px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-corporate-brand" />
            <h3 className="text-sm font-semibold text-corporate-text">
              Submitted Document Details
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {documentEntries.map((doc) => (
              <div
                key={doc.label}
                className="rounded-lg border border-corporate-border bg-corporate-bg/40 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  {doc.label}
                </p>
                <p className="mt-1 text-sm text-corporate-text">{doc.value}</p>
                <p className="mt-1 text-xs text-corporate-muted">
                  {doc.uploaded ? "Document on file" : "Pending submission"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
