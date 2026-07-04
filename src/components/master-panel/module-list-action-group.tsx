"use client";

import { Eye, Link2, Pencil } from "lucide-react";
import type { ReactNode } from "react";

type ModuleListActionGroupProps = {
  onView?: () => void;
  onSelect?: () => void;
  onEdit: () => void;
  showView?: boolean;
  showSelect?: boolean;
  selectLabel?: string;
  editLabel?: string;
  extra?: ReactNode;
};

export default function ModuleListActionGroup({
  onView,
  onSelect,
  onEdit,
  showView = true,
  showSelect = true,
  selectLabel = "Select / Use",
  editLabel = "Edit / Modify",
  extra,
}: ModuleListActionGroupProps) {
  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {showView && onView && (
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1 rounded-lg border border-corporate-border px-2 py-1 text-xs font-medium text-corporate-text hover:bg-corporate-bg"
          title="View full profile"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
      )}
      {showSelect && onSelect && (
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex items-center gap-1 rounded-lg border border-corporate-brand/40 bg-corporate-brand-light/40 px-2 py-1 text-xs font-medium text-corporate-brand hover:bg-corporate-brand-light"
          title="Select for transaction workflow"
        >
          <Link2 className="h-3.5 w-3.5" />
          {selectLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-lg border border-corporate-border px-2 py-1 text-xs font-medium text-corporate-text hover:bg-corporate-bg"
      >
        <Pencil className="h-3.5 w-3.5" />
        {editLabel}
      </button>
      {extra}
    </div>
  );
}
