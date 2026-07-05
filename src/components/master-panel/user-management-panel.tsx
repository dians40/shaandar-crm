"use client";

import { useCallback, useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  "Super Admin",
  "Manager",
  "Accountant",
  "Cashier",
  "Supervisor",
  "Operator",
] as const;

const MODULES = [
  { id: "masters", label: "Masters", description: "Administration and master data" },
  { id: "sales", label: "Sales", description: "Sales invoices and returns" },
  { id: "purchase", label: "Purchase", description: "Purchase vouchers and returns" },
  { id: "expenses", label: "Expenses", description: "Expenses, receipts, and journals" },
  { id: "vehicle-trips", label: "Vehicle Trips", description: "Vehicle transaction logs" },
  { id: "parts-orders", label: "Parts Orders", description: "Parts order workflow" },
  {
    id: "maintenance-alerts",
    label: "Maintenance Alerts",
    description: "Preventive maintenance alerts",
  },
] as const;

const PERMISSIONS = [
  { key: "view", label: "View" },
  { key: "create", label: "Create / Entry" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
] as const;

type PermissionKey = (typeof PERMISSIONS)[number]["key"];
type RoleName = (typeof ROLES)[number];
type ModuleId = (typeof MODULES)[number]["id"];

type PermissionMatrix = Record<
  RoleName,
  Record<ModuleId, Record<PermissionKey, boolean>>
>;

function createDefaultMatrix(): PermissionMatrix {
  return ROLES.reduce((roleAccumulator, role) => {
    roleAccumulator[role] = MODULES.reduce((moduleAccumulator, module) => {
      moduleAccumulator[module.id] = PERMISSIONS.reduce(
        (permissionAccumulator, permission) => {
          permissionAccumulator[permission.key] = role === "Super Admin";
          return permissionAccumulator;
        },
        {} as Record<PermissionKey, boolean>
      );
      return moduleAccumulator;
    }, {} as Record<ModuleId, Record<PermissionKey, boolean>>);
    return roleAccumulator;
  }, {} as PermissionMatrix);
}

export default function UserManagementPanel() {
  const [matrix, setMatrix] = useState<PermissionMatrix>(() => createDefaultMatrix());

  const togglePermission = useCallback(
    (role: RoleName, moduleId: ModuleId, permission: PermissionKey, enabled: boolean) => {
      if (role === "Super Admin") return;

      setMatrix((current) => ({
        ...current,
        [role]: {
          ...current[role],
          [moduleId]: {
            ...current[role][moduleId],
            [permission]: enabled,
          },
        },
      }));
    },
    []
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col" aria-label="User management workspace">
      <div className="mb-4 border-b border-corporate-border pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-corporate-text">
              Role &amp; Rights Permissions Matrix
            </h2>
            <p className="text-sm text-corporate-muted">
              Configure View, Create, Edit, and Delete rights across major modules. UI-only
              preview — database sync will follow in a later phase.
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-corporate-border bg-corporate-bg">
              <th className="sticky left-0 z-10 min-w-[180px] border-r border-corporate-border bg-corporate-bg px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                Module / Role
              </th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  colSpan={PERMISSIONS.length}
                  className="border-r border-corporate-border px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-corporate-text last:border-r-0"
                >
                  {role}
                </th>
              ))}
            </tr>
            <tr className="border-b border-corporate-border bg-corporate-bg/70">
              <th className="sticky left-0 z-10 border-r border-corporate-border bg-corporate-bg/70 px-4 py-2" />
              {ROLES.map((role) =>
                PERMISSIONS.map((permission) => (
                  <th
                    key={`${role}-${permission.key}`}
                    className="min-w-[68px] border-r border-corporate-border px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-corporate-muted last:border-r-0"
                  >
                    {permission.label}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((module) => (
              <tr
                key={module.id}
                className="border-b border-corporate-border last:border-b-0"
              >
                <td className="sticky left-0 z-10 border-r border-corporate-border bg-white px-4 py-3">
                  <p className="font-semibold text-corporate-text">{module.label}</p>
                  <p className="text-xs text-corporate-muted">{module.description}</p>
                </td>
                {ROLES.map((role) =>
                  PERMISSIONS.map((permission) => {
                    const isSuperAdmin = role === "Super Admin";
                    const checked =
                      isSuperAdmin || matrix[role][module.id][permission.key];

                    return (
                      <td
                        key={`${module.id}-${role}-${permission.key}`}
                        className="border-r border-corporate-border px-2 py-3 text-center last:border-r-0"
                      >
                        <label className="inline-flex cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSuperAdmin}
                            onChange={(event) =>
                              togglePermission(
                                role,
                                module.id,
                                permission.key,
                                event.target.checked
                              )
                            }
                            className={cn(
                              "h-4 w-4 rounded border-corporate-border text-corporate-brand focus:ring-corporate-brand",
                              isSuperAdmin && "cursor-not-allowed opacity-60"
                            )}
                            aria-label={`${role} ${module.label} ${permission.label}`}
                          />
                        </label>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
