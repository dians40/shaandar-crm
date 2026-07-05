"use client";

import { useCallback, useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  MASTER_LIST_TABLE_CLASS,
} from "./universal-master-list";

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
  { id: "maintenance-alerts", label: "Maintenance Alerts", description: "Preventive maintenance" },
  { id: "orders", label: "Order Module", description: "Party order retention and tracking" },
  { id: "loading", label: "Loading Module", description: "Loading bay and dispatch detail" },
  { id: "transfer", label: "Transfer Module", description: "Inter-godown stock movement" },
  { id: "manufacturing", label: "Manufacturing Module", description: "Production run tracking" },
  { id: "overtime", label: "Overtime Module", description: "Overtime tracker and payouts" },
  { id: "attendance", label: "Attendance Module", description: "Daily labor attendance" },
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
  const [selectedRole, setSelectedRole] = useState<RoleName>("Manager");
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
                Select a role to configure module permissions across the operational workspace.
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
              onChange={(event) => setSelectedRole(event.target.value as RoleName)}
              className="input-field w-full font-semibold"
            >
              {ROLES.map((role) => (
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
              {MODULES.map((module) => (
                <tr key={module.id} className="hover:bg-corporate-bg/40">
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "py-5")}>
                    <p className="text-base font-semibold text-corporate-text">{module.label}</p>
                    <p className="mt-1 text-sm text-corporate-muted">{module.description}</p>
                  </td>
                  {PERMISSIONS.map((permission) => {
                    const checked =
                      isSuperAdmin || matrix[selectedRole][module.id][permission.key];

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
                              togglePermission(
                                selectedRole,
                                module.id,
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
