"use client";

import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import {
  PERMISSION_LABELS,
  PERMISSION_MODULES,
  USER_ROLES,
  type PermissionKey,
  type PermissionModuleId,
  type UserRoleName,
} from "@/types/user-permissions";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

const PERMISSIONS = (
  Object.entries(PERMISSION_LABELS) as [PermissionKey, string][]
).map(([key, label]) => ({ key, label }));

export default function UserManagementPanel() {
  const { matrix, selectedRole, setSelectedRole, setPermission } = useUserPermissions();
  const isSuperAdmin = selectedRole === "Super Admin";

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="User management workspace">
      <div className="border-b border-corporate-border pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-corporate-brand" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-corporate-text">
                Role &amp; Rights Permissions
              </h2>
              <p className="text-sm text-corporate-muted">
                Changes save instantly and update the left sidebar menu visibility for the
                selected role.
              </p>
            </div>
          </div>

          <div className="min-w-[240px]">
            <label
              htmlFor="select-role"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-muted"
            >
              Select Role
            </label>
            <select
              id="select-role"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as UserRoleName)}
              className="input-field w-full font-semibold"
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <div className="border-b border-corporate-border bg-corporate-bg px-5 py-4">
          <p className="text-sm font-semibold text-corporate-text">
            Permissions for: <span className="text-corporate-brand">{selectedRole}</span>
          </p>
          {isSuperAdmin && (
            <p className="mt-1 text-xs text-corporate-muted">
              Super Admin retains full access. All permissions are locked on.
            </p>
          )}
        </div>

        <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
          <table className={cn(MASTER_LIST_TABLE_CLASS, "w-full")}>
            <thead className={MASTER_LIST_HEAD_CLASS}>
              <tr>
                <th className={cn(MASTER_LIST_HEADER_CELL_CLASS, "min-w-[280px] py-4")}>
                  Operational Module
                </th>
                {PERMISSIONS.map((permission) => (
                  <th
                    key={permission.key}
                    className={cn(MASTER_LIST_HEADER_CELL_CLASS, "min-w-[140px] py-4 text-center")}
                  >
                    {permission.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {PERMISSION_MODULES.map((module) => (
                <tr key={module.id} className="hover:bg-corporate-bg/40">
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "py-5")}>
                    <p className="text-base font-semibold text-corporate-text">{module.label}</p>
                    <p className="mt-1 text-sm text-corporate-muted">{module.description}</p>
                  </td>
                  {PERMISSIONS.map((permission) => {
                    const checked =
                      isSuperAdmin ||
                      matrix[selectedRole][module.id as PermissionModuleId][permission.key];

                    return (
                      <td
                        key={`${module.id}-${permission.key}`}
                        className={cn(MASTER_LIST_BODY_CELL_CLASS, "py-5 text-center")}
                      >
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSuperAdmin}
                            onChange={(event) =>
                              setPermission(
                                selectedRole,
                                module.id as PermissionModuleId,
                                permission.key,
                                event.target.checked
                              )
                            }
                            className={cn(
                              "h-5 w-5 rounded border-corporate-border text-corporate-brand focus:ring-corporate-brand",
                              isSuperAdmin && "cursor-not-allowed opacity-60"
                            )}
                            aria-label={`${selectedRole} ${module.label} ${permission.label}`}
                          />
                          <span className="hidden text-sm font-medium text-corporate-muted xl:inline">
                            {permission.label}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
