"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VEHICLE_DOCUMENT_LABELS,
  getExpiryStatus,
  type VehicleDocumentKey,
  type VehicleMasterRecord,
} from "@/types/vehicle-master";

type VehicleProfileCardProps = {
  record: VehicleMasterRecord;
  onEdit?: () => void;
  onBack?: () => void;
};

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const status = getExpiryStatus(expiryDate);

  if (status === "unset") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-corporate-bg px-2 py-0.5 text-xs text-corporate-muted">
        <Clock className="h-3 w-3" />
        Not set
      </span>
    );
  }

  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Expired
      </span>
    );
  }

  if (status === "expiring") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        <AlertTriangle className="h-3 w-3" />
        Renew soon
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      <CheckCircle2 className="h-3 w-3" />
      Valid
    </span>
  );
}

export default function VehicleProfileCard({
  record,
  onEdit,
  onBack,
}: VehicleProfileCardProps) {
  const docKeys = Object.keys(VEHICLE_DOCUMENT_LABELS) as VehicleDocumentKey[];

  return (
    <div className="space-y-5 rounded-xl border border-corporate-border bg-gradient-to-br from-corporate-surface to-corporate-bg/60 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-corporate-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-corporate-text">{record.vehicleName}</h2>
          <p className="mt-1 text-sm text-corporate-muted">
            {record.registrationNumber} · {record.model || "Model not set"}
          </p>
          {record.ownerDetails && (
            <p className="mt-2 text-sm text-corporate-text">
              Owner: {record.ownerDetails}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-corporate-border px-3 py-1.5 text-sm"
            >
              Back
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-corporate-brand px-3 py-1.5 text-sm font-medium text-white"
            >
              Edit Vehicle
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-corporate-muted">
          Compliance & Document Tracker
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {docKeys.map((key) => {
            const block = record.documents[key];
            const status = getExpiryStatus(block.expiryDate);
            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border p-3",
                  status === "expired" && "border-red-200 bg-red-50/50",
                  status === "expiring" && "border-amber-200 bg-amber-50/50",
                  status === "valid" && "border-emerald-200/60 bg-white",
                  status === "unset" && "border-corporate-border bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-corporate-text">
                    {VEHICLE_DOCUMENT_LABELS[key]}
                  </p>
                  <ExpiryBadge expiryDate={block.expiryDate} />
                </div>
                <p className="mt-2 text-xs text-corporate-muted">
                  Expiry: {block.expiryDate || "—"}
                </p>
                {block.fileName && (
                  <p className="mt-1 truncate text-xs text-corporate-brand">
                    File: {block.fileName}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getVehicleRenewalSummary(record: VehicleMasterRecord): string {
  const docKeys = Object.keys(VEHICLE_DOCUMENT_LABELS) as VehicleDocumentKey[];
  let expired = 0;
  let expiring = 0;
  for (const key of docKeys) {
    const status = getExpiryStatus(record.documents[key].expiryDate);
    if (status === "expired") expired += 1;
    if (status === "expiring") expiring += 1;
  }
  if (expired > 0) return `${expired} expired`;
  if (expiring > 0) return `${expiring} renew soon`;
  return "All valid";
}
