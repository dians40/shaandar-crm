"use client";

import { useState } from "react";
import { Plus, Shield } from "lucide-react";
import AddUserModal from "./add-user-modal";
import RoleModelWorkspace from "./role-model-workspace";
import RoleSelectorWithActions from "./role-selector-with-actions";
import UserPipelineLayerPanel from "./user-pipeline-layer-panel";
import { useManagedUsers } from "@/hooks/use-managed-users";
import { useRoleModels } from "@/hooks/use-role-models";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { cn } from "@/lib/utils";
import { USER_PIPELINE_STAGES } from "@/types/user-pipeline";
import {
  PERMISSION_LABELS,
  PERMISSION_MODULES,
  isProtectedRole,
  type PermissionKey,
  type PermissionModuleId,
} from "@/types/user-permissions";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

const PERMISSIONS = (
  Object.entries(PERMISSION_LABELS) as [PermissionKey, string][]
).map(([key, label]) => ({ key, label }));

const LAYER_NAV = [
  { layer: 1, label: "User Intake" },
  { layer: 2, label: "Staging Review" },
  { layer: 3, label: "Active Workflow" },
  { layer: 4, label: "Saved Records" },
] as const;

export default function UserManagementPanel() {
  const {
    matrix,
    roles,
    selectedRole,
    setSelectedRole,
    setPermission,
    addRole,
    editRole,
    removeRole,
  } = useUserPermissions();
  const { isReady, addUser, setOtpEnabled, reload } = useManagedUsers();
  const { syncAfterRoleRename, syncAfterRoleRemove } = useRoleModels();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pipelineRefreshToken, setPipelineRefreshToken] = useState(0);
  const isSuperAdmin = isProtectedRole(selectedRole);

  const handleEditRole = (currentName: string, nextName: string) => {
    const result = editRole(currentName, nextName);
    if (!result) {
      syncAfterRoleRename(currentName, nextName.trim());
      reload();
    }
    return result;
  };

  const handleRemoveRole = (name: string) => {
    const result = removeRole(name);
    if (!result) {
      syncAfterRoleRemove(name);
      reload();
    }
    return result;
  };

  const bumpPipeline = () => setPipelineRefreshToken((token) => token + 1);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="User management workspace">
      <div className="border-b border-corporate-border pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-corporate-brand" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-corporate-text">
                User Management &amp; Role Security
              </h2>
              <p className="text-sm text-corporate-muted">
                Four-layer sequential user pipeline — intake, staging review, active workflow, then
                saved records log.
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav
        className="sticky top-0 z-20 rounded-xl border border-corporate-border bg-corporate-surface/95 p-3 shadow-card backdrop-blur"
        aria-label="User management four-layer pipeline navigation"
      >
        <div className="flex flex-wrap gap-2">
          {LAYER_NAV.map(({ layer, label }) => (
            <button
              key={layer}
              type="button"
              onClick={() => {
                document
                  .getElementById(`user-layer-${layer}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-corporate-border bg-white px-3 py-1.5 text-xs font-semibold text-corporate-text hover:border-corporate-brand/40"
            >
              <span className="rounded-full bg-corporate-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                L{layer}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Layer 1 — User intake */}
      <section
        id="user-layer-1"
        className="scroll-mt-28 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card"
        aria-label="Layer 1 — User intake"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-corporate-brand">
              Layer 1
            </p>
            <h3 className="text-sm font-bold text-corporate-text">User Intake &amp; Registration</h3>
            <p className="text-xs text-corporate-muted">
              New users enter the pipeline at LAYER_2_STAGING after registration.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary inline-flex min-h-11 items-center gap-2 px-5 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add New User
          </button>
        </div>
      </section>

      {/* Layer 2 — Staging */}
      <div id="user-layer-2" className="scroll-mt-28">
        <UserPipelineLayerPanel
          stage={USER_PIPELINE_STAGES.LAYER_2_STAGING}
          refreshToken={pipelineRefreshToken}
          onApproved={bumpPipeline}
        />
      </div>

      {/* Layer 3 — Active workflow */}
      <div id="user-layer-3" className="scroll-mt-28">
        <UserPipelineLayerPanel
          stage={USER_PIPELINE_STAGES.LAYER_3_WORKFLOW}
          refreshToken={pipelineRefreshToken}
          onApproved={bumpPipeline}
          showOtpToggle
          onOtpToggle={setOtpEnabled}
        />
      </div>

      {/* Layer 4 — Saved records */}
      <div id="user-layer-4" className="scroll-mt-28">
        <UserPipelineLayerPanel
          stage={USER_PIPELINE_STAGES.LAYER_4_SAVED}
          refreshToken={pipelineRefreshToken}
        />
      </div>

      <RoleModelWorkspace />

      <div className="w-full min-w-0 flex-1 rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-corporate-border bg-corporate-bg px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-corporate-text">
              Permissions for: <span className="text-corporate-brand">{selectedRole}</span>
            </p>
            {isSuperAdmin && (
              <p className="mt-1 text-xs text-corporate-muted">
                Super Admin retains full access. All permissions are locked on.
              </p>
            )}
          </div>

          <RoleSelectorWithActions
            roles={roles}
            value={selectedRole}
            onChange={setSelectedRole}
            onAddRole={addRole}
            onEditRole={handleEditRole}
            onRemoveRole={handleRemoveRole}
            selectId="permissions-select-role"
          />
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
                      matrix[selectedRole]?.[module.id as PermissionModuleId]?.[permission.key];

                    return (
                      <td
                        key={`${module.id}-${permission.key}`}
                        className={cn(MASTER_LIST_BODY_CELL_CLASS, "py-5 text-center")}
                      >
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(checked)}
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

      <AddUserModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={(user) => {
          addUser(user);
          bumpPipeline();
        }}
        roles={roles}
      />

      {!isReady && (
        <p className="text-sm text-corporate-muted">Loading user pipeline workspace...</p>
      )}
    </section>
  );
}
