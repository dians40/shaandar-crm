"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import { useRoleModels } from "@/hooks/use-role-models";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { cn } from "@/lib/utils";
import {
  EMPTY_ROLE_MODEL_FORM,
  validateRoleModelForm,
  type RoleModelFormState,
} from "@/types/role-model";
import RoleSelectorWithActions from "./role-selector-with-actions";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

export default function RoleModelWorkspace() {
  const { roles, addRole, editRole, removeRole } = useUserPermissions();
  const { records, isReady, addRecord, syncAfterRoleRename, syncAfterRoleRemove } =
    useRoleModels();
  const [form, setForm] = useState<RoleModelFormState>({
    ...EMPTY_ROLE_MODEL_FORM,
    role: roles[0] ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!form.role && roles.length > 0) {
      setForm((current) => ({ ...current, role: roles[0] }));
    }
  }, [form.role, roles]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => record.role.toLowerCase().includes(query));
  }, [records, searchQuery]);

  const handleAddRole = (name: string) => addRole(name);

  const handleEditRole = (currentName: string, nextName: string) => {
    const result = editRole(currentName, nextName);
    if (!result) {
      syncAfterRoleRename(currentName, nextName.trim());
    }
    return result;
  };

  const handleRemoveRole = (name: string) => {
    const result = removeRole(name);
    if (!result) {
      syncAfterRoleRemove(name);
      if (form.role === name) {
        setForm((current) => ({ ...current, role: roles[0] ?? "" }));
      }
    }
    return result;
  };

  const handleSubmit = () => {
    setError(null);
    setSuccess(null);

    const validationError = validateRoleModelForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    addRecord({
      id: `role-model-${Date.now()}`,
      role: form.role,
      createdAt: new Date().toISOString(),
    });

    setSuccess("Role model saved successfully.");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-corporate-border/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <header className="border-b border-corporate-border/70 bg-gradient-to-r from-indigo-50/90 to-violet-50/40 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            <ClipboardList className="h-5 w-5 text-indigo-700" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-corporate-muted">
              Role Model Workspace
            </p>
            <h3 className="text-base font-semibold tracking-tight text-corporate-text">
              Add New Role Model
            </h3>
            <p className="mt-0.5 text-sm text-corporate-muted">
              Define and manage operational role designations with inline add, edit, and remove
              controls.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-5">
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-corporate-border/80 bg-slate-50/60 p-4 shadow-inner">
          <RoleSelectorWithActions
            roles={roles}
            value={form.role}
            onChange={(role) => setForm((current) => ({ ...current, role }))}
            onAddRole={handleAddRole}
            onEditRole={handleEditRole}
            onRemoveRole={handleRemoveRole}
            selectId="role-model-select-role"
            label="Select Role"
          />

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Save Role Model
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-corporate-border/80 bg-white shadow-sm">
          <div className="border-b border-corporate-border px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-corporate-text">Role Model History</p>
                <p className="text-xs text-corporate-muted">
                  {filteredRecords.length} of {records.length} role record
                  {records.length === 1 ? "" : "s"} shown
                </p>
              </div>
              <div className="relative min-w-[280px] flex-1 sm:max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by role designation..."
                  className="input-field w-full pl-10 text-sm"
                  aria-label="Search and filter role model history"
                />
              </div>
            </div>
          </div>

          <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
            <table className={cn(MASTER_LIST_TABLE_CLASS, "w-full")}>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Role Designation</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Saved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {!isReady ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-corporate-muted">
                      Loading role model history...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-corporate-muted">
                      {records.length === 0
                        ? "No role models saved yet. Use the form above to create one."
                        : "No records match your search filter."}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-corporate-bg/40">
                      <td className={MASTER_LIST_BODY_CELL_CLASS}>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                          {record.role}
                        </span>
                      </td>
                      <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs text-corporate-muted")}>
                        {record.createdAt.slice(0, 10)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
