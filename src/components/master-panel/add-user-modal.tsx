"use client";

import { useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, X } from "lucide-react";
import { TextInput, SelectInput } from "@/components/forms/form-fields";
import { cn } from "@/lib/utils";
import { isUsernameTaken } from "@/lib/managed-users-store";
import {
  EMPTY_MANAGED_USER_FORM,
  generateRandomPassword,
  LAYER_2_USER_ROLE,
  LAYER_3_USER_ROLE,
  LAYER_4_USER_ROLE,
  validateManagedUserForm,
  type ManagedUserFormState,
  type ManagedUserRecord,
} from "@/types/managed-user";
import type { UserRoleName } from "@/types/user-permissions";
import { USER_PIPELINE_STAGES, type UserPipelineStage } from "@/types/user-pipeline";

type AddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (user: ManagedUserRecord, pipelineStage: UserPipelineStage) => void | Promise<void>;
  onUpdate?: (
    userId: string,
    patch: Partial<ManagedUserRecord>
  ) => void | Promise<void>;
  roles: string[];
  targetStage: UserPipelineStage;
  editingUser?: ManagedUserRecord | null;
};

export default function AddUserModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  roles,
  targetStage,
  editingUser = null,
}: AddUserModalProps) {
  const isEditMode = Boolean(editingUser);
  const isLayer2Intake = targetStage === USER_PIPELINE_STAGES.LAYER_2_STAGING;
  const isLayer3Intake = targetStage === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW;
  const isLayer4Intake = targetStage === USER_PIPELINE_STAGES.LAYER_4_SAVED;
  const isLockedLayerRole = isLayer2Intake || isLayer3Intake || isLayer4Intake;
  const lockedLayerRole = isLayer2Intake
    ? LAYER_2_USER_ROLE
    : isLayer3Intake
      ? LAYER_3_USER_ROLE
      : isLayer4Intake
        ? LAYER_4_USER_ROLE
        : null;
  const lockedLayerRoleLabel = isLayer2Intake
    ? `${LAYER_2_USER_ROLE} — Attendance Layer 2 Staging Review`
    : isLayer3Intake
      ? `${LAYER_3_USER_ROLE} — Attendance Layer 3 Live Workflow`
      : isLayer4Intake
        ? `${LAYER_4_USER_ROLE} — Attendance Layer 4 Saved Records`
        : null;
  const [form, setForm] = useState<ManagedUserFormState>(EMPTY_MANAGED_USER_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingUser) {
      setForm({
        fullName: editingUser.fullName,
        username: editingUser.username,
        password: editingUser.password,
        role: editingUser.role,
        otpEnabled: editingUser.otpEnabled,
      });
    } else {
      setForm({
        ...EMPTY_MANAGED_USER_FORM,
        role: lockedLayerRole ?? "",
      });
    }
    setError(null);
  }, [open, editingUser, lockedLayerRole]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    const validationError = validateManagedUserForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isUsernameTaken(form.username, editingUser?.id)) {
      setError("This username is already registered.");
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && editingUser && onUpdate) {
        await onUpdate(editingUser.id, {
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role as UserRoleName,
          otpEnabled: form.otpEnabled,
        });
        setForm(EMPTY_MANAGED_USER_FORM);
        onClose();
        return;
      }

      const user: ManagedUserRecord = {
        id: crypto.randomUUID(),
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        password: form.password,
        role: (lockedLayerRole ?? form.role) as UserRoleName,
        otpEnabled: form.otpEnabled,
        createdAt: new Date().toISOString(),
        pipelineStage: targetStage,
      };

      await onCreate(user, targetStage);
      setForm(EMPTY_MANAGED_USER_FORM);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user to database.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-user-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-corporate-border bg-corporate-surface p-6 shadow-card-md">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 id="add-user-modal-title" className="text-lg font-semibold text-corporate-text">
              {isEditMode ? "Edit User" : "Add New User"}
            </h3>
            <p className="mt-1 text-sm text-corporate-muted">
              {isEditMode
                ? "Update credentials and role-based access for this workspace user."
                : "Create credentials and assign role-based access for this workspace."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-corporate-border p-2 text-corporate-muted hover:bg-corporate-bg"
            aria-label="Close user dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <TextInput
            label="Full Name"
            required
            value={form.fullName}
            placeholder="Enter full name"
            onChange={(event) =>
              setForm((current) => ({ ...current, fullName: event.target.value }))
            }
          />

          {isLockedLayerRole && lockedLayerRoleLabel ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-corporate-text">
                Role / Permission
              </p>
              <p className="rounded-lg border border-corporate-border bg-corporate-bg px-3 py-2 text-sm font-semibold text-corporate-brand">
                {lockedLayerRoleLabel}
              </p>
            </div>
          ) : (
            <SelectInput
              label="Role / Permission"
              required
              value={form.role}
              placeholder="Select role"
              options={roles.map((role) => ({ value: role, label: role }))}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as UserRoleName,
                }))
              }
            />
          )}

          <TextInput
            label="Username"
            required
            value={form.username}
            placeholder="e.g. jsmith"
            onChange={(event) =>
              setForm((current) => ({ ...current, username: event.target.value }))
            }
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="new-user-password" className="text-sm font-medium text-corporate-text">
                Secure Password
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    password: generateRandomPassword(),
                  }))
                }
                className="inline-flex items-center gap-1 rounded-full border border-corporate-border px-3 py-1 text-xs font-semibold text-corporate-brand hover:bg-corporate-brand/5"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                Generate Random Password
              </button>
            </div>
            <input
              id="new-user-password"
              type="text"
              required
              value={form.password}
              placeholder="Set a secure password"
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              className="input-field w-full font-mono text-sm"
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-corporate-border bg-corporate-bg px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-corporate-text">
                Enable Secure OTP Verification on Login
              </p>
              <p className="text-xs text-corporate-muted">
                Requires a one-time passcode after username and password.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.otpEnabled}
              onChange={(event) =>
                setForm((current) => ({ ...current, otpEnabled: event.target.checked }))
              }
              className="h-5 w-5 rounded border-corporate-border text-corporate-brand focus:ring-corporate-brand"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-corporate-border px-5 py-2.5 text-sm font-semibold text-corporate-text hover:bg-corporate-bg disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className={cn(
              "btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60"
            )}
          >
            {isSaving ? (
              "Saving..."
            ) : isEditMode ? (
              <>
                <Pencil className="h-4 w-4" aria-hidden />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden />
                Create User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
