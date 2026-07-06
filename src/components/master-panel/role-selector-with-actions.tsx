"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isProtectedRole } from "@/types/user-permissions";

type RoleSelectorWithActionsProps = {
  roles: string[];
  value: string;
  onChange: (role: string) => void;
  onAddRole: (name: string) => string | null;
  onEditRole: (currentName: string, nextName: string) => string | null;
  onRemoveRole: (name: string) => string | null;
  selectId?: string;
  label?: string;
  className?: string;
};

export default function RoleSelectorWithActions({
  roles,
  value,
  onChange,
  onAddRole,
  onEditRole,
  onRemoveRole,
  selectId = "select-role",
  label = "Select Role",
  className,
}: RoleSelectorWithActionsProps) {
  const [mode, setMode] = useState<"idle" | "add" | "edit">("idle");
  const [draftName, setDraftName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const resetAction = () => {
    setMode("idle");
    setDraftName("");
    setActionError(null);
  };

  const handleAdd = () => {
    const error = onAddRole(draftName);
    if (error) {
      setActionError(error);
      return;
    }
    onChange(draftName.trim());
    resetAction();
  };

  const handleEdit = () => {
    const error = onEditRole(value, draftName);
    if (error) {
      setActionError(error);
      return;
    }
    onChange(draftName.trim());
    resetAction();
  };

  const handleRemove = () => {
    const error = onRemoveRole(value);
    if (error) {
      setActionError(error);
      return;
    }
    resetAction();
  };

  const canEditSelected = value && !isProtectedRole(value);
  const canRemoveSelected = value && !isProtectedRole(value);

  return (
    <div className={cn("min-w-[280px]", className)}>
      <label
        htmlFor={selectId}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
      >
        {label}
      </label>

      <div className="flex items-stretch gap-2">
        <select
          id={selectId}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            resetAction();
          }}
          className="input-field min-w-0 flex-1 font-semibold"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setMode("add");
            setDraftName("");
            setActionError(null);
          }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          aria-label="Add new role"
          title="Add new role"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!canEditSelected) return;
            setMode("edit");
            setDraftName(value);
            setActionError(null);
          }}
          disabled={!canEditSelected}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Edit selected role"
          title="Edit selected role"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={handleRemove}
          disabled={!canRemoveSelected}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Remove selected role"
          title="Remove selected role"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {mode !== "idle" && (
        <div className="mt-3 rounded-xl border border-corporate-border bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-corporate-muted">
            {mode === "add" ? "Add New Role Designation" : "Edit Role Designation"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
                setActionError(null);
              }}
              placeholder="Enter role name"
              className="input-field min-w-[180px] flex-1 text-sm"
            />
            <button
              type="button"
              onClick={mode === "add" ? handleAdd : handleEdit}
              className="rounded-lg bg-corporate-brand px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              {mode === "add" ? "Add Role" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={resetAction}
              className="rounded-lg border border-corporate-border px-3 py-2 text-xs font-semibold text-corporate-text hover:bg-corporate-bg"
            >
              Cancel
            </button>
          </div>
          {actionError && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {actionError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
