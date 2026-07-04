"use client";

import { Trash2 } from "lucide-react";

type MasterRemoveOrProtectedProps = {
  canRemove: boolean;
  onRemove: () => void;
  label?: string;
  disabled?: boolean;
  title?: string;
};

export default function MasterRemoveOrProtected({
  canRemove,
  onRemove,
  label = "Remove",
  disabled = false,
  title = "Cannot remove — referenced in transactions or dependent masters",
}: MasterRemoveOrProtectedProps) {
  if (!canRemove) {
    return (
      <span
        className="inline-flex items-center rounded-lg border border-corporate-border px-2 py-1 text-xs text-corporate-muted"
        title={title}
      >
        Protected
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
