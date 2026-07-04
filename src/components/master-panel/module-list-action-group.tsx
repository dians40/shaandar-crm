"use client";

import { Eye, Pencil } from "lucide-react";
import type { ReactNode } from "react";

type ModuleListActionGroupProps = {
  onView?: () => void;
  onEdit: () => void;
  showView?: boolean;
  editLabel?: string;
  extra?: ReactNode;
};

export default function ModuleListActionGroup({
  onView,
  onEdit,
  showView = true,
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
