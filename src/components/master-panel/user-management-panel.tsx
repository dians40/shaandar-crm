"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Shield, Trash2, UserRound } from "lucide-react";
import AddUserModal from "./add-user-modal";
import RoleModelWorkspace from "./role-model-workspace";
import RoleSelectorWithActions from "./role-selector-with-actions";
import { useManagedUsers } from "@/hooks/use-managed-users";
import { useRoleModels } from "@/hooks/use-role-models";
import { useUserPermissions } from "@/contexts/user-permissions-context";
import { cn } from "@/lib/utils";
import type { ManagedUserRecord } from "@/types/managed-user";
import { resolveUserPipelineStage } from "@/types/managed-user";
import {
  PERMISSION_LABELS,
  PERMISSION_MODULES,
  isProtectedRole,
  type PermissionKey,
  type PermissionModuleId,
} from "@/types/user-permissions";
import {
  USER_PIPELINE_STAGES,
  type UserPipelineStage,
} from "@/types/user-pipeline";
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

const LAYER_STAGE_MAP: Record<2 | 3 | 4, UserPipelineStage> = {
  2: USER_PIPELINE_STAGES.LAYER_2_STAGING,
  3: USER_PIPELINE_STAGES.LAYER_3_WORKFLOW,
  4: USER_PIPELINE_STAGES.LAYER_4_SAVED,
};

type UserLayerSectionProps = {
  layer: 2 | 3 | 4;
  title: string;
  description: string;
  users: ManagedUserRecord[];
  isReady: boolean;
  onAddUser: () => void;
  onEditUser: (user: ManagedUserRecord) => void;
  onRemoveUser: (user: ManagedUserRecord) => void;
  showOtp?: boolean;
  onOtpToggle?: (userId: string, enabled: boolean) => void;
};

function UserLayerSection({
  layer,
  title,
  description,
  users,
  isReady,
  onAddUser,
  onEditUser,
  onRemoveUser,
  showOtp = false,
  onOtpToggle,
}: UserLayerSectionProps) {
  return (
    <section
      id={`user-layer-${layer}`}
      className="scroll-mt-28 rounded-xl border border-corporate-border bg-corporate-surface shadow-card"
      aria-label={`Layer ${layer} — ${title}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-corporate-border px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-corporate-brand">
            Layer {layer}
          </p>
          <h3 className="text-sm font-bold text-corporate-text">{title}</h3>
          <p className="text-xs text-corporate-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAddUser}
          className="btn-primary inline-flex min-h-10 items-center gap-2 px-4 text-sm"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add New User
        </button>
      </div>

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
        <table className={cn(MASTER_LIST_TABLE_CLASS, "w-full")}>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Full Name</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Username</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Role</th>
              {showOtp && (
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Secure OTP on Login</th>
              )}
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Created</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {!isReady ? (
              <tr>
                <td
                  colSpan={showOtp ? 6 : 5}
                  className="px-4 py-8 text-center text-sm text-corporate-muted"
                >
                  Loading user accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={showOtp ? 6 : 5}
                  className="px-4 py-8 text-center text-sm text-corporate-muted"
                >
                  No users in this section yet. Use Add New User to register credentials.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={`${layer}-${user.id}`} className="hover:bg-corporate-bg/40">
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                    {user.fullName}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{user.username}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{user.role}</td>
                  {showOtp && onOtpToggle && (
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={user.otpEnabled}
                          onChange={(event) => onOtpToggle(user.id, event.target.checked)}
                          className="h-5 w-5 rounded border-corporate-border text-corporate-brand focus:ring-corporate-brand"
                          aria-label={`Enable Secure OTP Verification on Login for ${user.fullName}`}
                        />
                        <span className="text-xs font-medium text-corporate-muted">
                          Enable Secure OTP Verification on Login
                        </span>
                      </label>
                    </td>
                  )}
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs text-corporate-muted")}>
                    {user.createdAt.slice(0, 10)}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEditUser(user)}
                        className="inline-flex items-center gap-1 rounded-lg border border-corporate-border px-2.5 py-1.5 text-xs font-semibold text-corporate-text hover:bg-corporate-bg"
                        aria-label={`Edit ${user.fullName}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveUser(user)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        aria-label={`Remove ${user.fullName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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
  const { users, isReady, addUser, editUser, removeUser, setOtpEnabled, reload } =
    useManagedUsers();
  const { syncAfterRoleRename, syncAfterRoleRemove } = useRoleModels();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<UserPipelineStage>(
    USER_PIPELINE_STAGES.LAYER_2_STAGING
  );
  const [editingUser, setEditingUser] = useState<ManagedUserRecord | null>(null);
  const isSuperAdmin = isProtectedRole(selectedRole);

  const layer2Users = useMemo(
    () =>
      users
        .filter((user) => resolveUserPipelineStage(user) === USER_PIPELINE_STAGES.LAYER_2_STAGING)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [users]
  );
  const layer3Users = useMemo(
    () =>
      users
        .filter((user) => resolveUserPipelineStage(user) === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [users]
  );
  const layer4Users = useMemo(
    () =>
      users
        .filter((user) => resolveUserPipelineStage(user) === USER_PIPELINE_STAGES.LAYER_4_SAVED)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [users]
  );

  const openAddModal = (layer: 2 | 3 | 4) => {
    setEditingUser(null);
    setTargetStage(LAYER_STAGE_MAP[layer]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: ManagedUserRecord) => {
    setEditingUser(user);
    setTargetStage(user.pipelineStage ?? USER_PIPELINE_STAGES.LAYER_2_STAGING);
    setIsAddModalOpen(true);
  };

  const handleRemoveUser = (user: ManagedUserRecord) => {
    const confirmed = window.confirm(
      `Remove ${user.fullName} from this layer? This action cannot be undone.`
    );
    if (!confirmed) return;
    removeUser(user.id);
  };

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
                User intake and registration controls are integrated across Layer 2, Layer 3, and
                Layer 4 workspace sections below.
              </p>
            </div>
          </div>
        </div>
      </div>

      <UserLayerSection
        layer={2}
        title="User Intake &amp; Staging Review"
        description="Register new user credentials and review pending account intake before activation."
        users={layer2Users}
        isReady={isReady}
        onAddUser={() => openAddModal(2)}
        onEditUser={openEditModal}
        onRemoveUser={handleRemoveUser}
        showOtp
        onOtpToggle={setOtpEnabled}
      />

      <UserLayerSection
        layer={3}
        title="Active Users Workflow"
        description="Manage active user accounts, OTP login protection, and operational access controls."
        users={layer3Users}
        isReady={isReady}
        onAddUser={() => openAddModal(3)}
        onEditUser={openEditModal}
        onRemoveUser={handleRemoveUser}
        showOtp
        onOtpToggle={setOtpEnabled}
      />

      <UserLayerSection
        layer={4}
        title="Saved User Records Log"
        description="Historical saved user account records and registration audit trail."
        users={layer4Users}
        isReady={isReady}
        onAddUser={() => openAddModal(4)}
        onEditUser={openEditModal}
        onRemoveUser={handleRemoveUser}
        showOtp
        onOtpToggle={setOtpEnabled}
      />

      <RoleModelWorkspace />

      <div className="w-full min-w-0 flex-1 rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-corporate-border bg-corporate-bg px-5 py-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-corporate-brand" aria-hidden />
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
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingUser(null);
        }}
        onCreate={addUser}
        onUpdate={editUser}
        roles={roles}
        targetStage={targetStage}
        editingUser={editingUser}
      />
    </section>
  );
}
