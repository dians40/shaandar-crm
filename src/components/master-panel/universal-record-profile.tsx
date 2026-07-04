"use client";

import { ArrowLeft, Pencil } from "lucide-react";

export type ProfileField = {
  label: string;
  value: string | number | boolean | null | undefined;
};

type UniversalRecordProfileProps = {
  title: string;
  subtitle?: string;
  fields: ProfileField[];
  onBack: () => void;
  onEdit?: () => void;
};

function formatProfileValue(value: ProfileField["value"]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function UniversalRecordProfile({
  title,
  subtitle,
  fields,
  onBack,
  onEdit,
}: UniversalRecordProfileProps) {
  return (
    <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-corporate-muted hover:text-corporate-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </button>
          <h2 className="text-lg font-semibold text-corporate-text">{title}</h2>
          {subtitle && <p className="text-sm text-corporate-muted">{subtitle}</p>}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-corporate-border px-3 py-2 text-sm font-medium hover:bg-corporate-bg"
          >
            <Pencil className="h-4 w-4" />
            Edit / Modify
          </button>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="rounded-lg border border-corporate-border bg-corporate-bg/50 px-3 py-2.5"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-corporate-muted">
              {field.label}
            </dt>
            <dd className="mt-1 text-sm text-corporate-text">{formatProfileValue(field.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
