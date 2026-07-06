"use client";

import { useState } from "react";
import { KeyRound, Plus, X } from "lucide-react";
import { TextInput, SelectInput } from "@/components/forms/form-fields";
import { cn } from "@/lib/utils";
import { isUsernameTaken } from "@/lib/managed-users-store";
import {
  EMPTY_MANAGED_USER_FORM,
  generateRandomPassword,
  validateManagedUserForm,
  type ManagedUserFormState,
  type ManagedUserRecord,
} from "@/types/managed-user";
import type { UserRoleName } from "@/types/user-permissions";

type AddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (user: ManagedUserRecord) => void;
  roles: string[];
};

export default function AddUserModal({ open, onClose, onCreate, roles }: AddUserModalProps) {
  const [form, setForm] = useState<ManagedUserFormState>(EMPTY_MANAGED_USER_FORM);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = () => {
    setError(null);
    const validationError = validateManagedUserForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isUsernameTaken(form.username)) {
      setError("This username is already registered.");
      return;
    }

    const user: ManagedUserRecord = {
      id: `user-${Date.now()}`,
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      password: form.password,
      role: form.role as UserRoleName,
      otpEnabled: form.otpEnabled,
      createdAt: new Date().toISOString(),
    };

    onCreate(user);
    setForm(EMPTY_MANAGED_USER_FORM);
    onClose();
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
              Add New User
            </h3>
            <p className="mt-1 text-sm text-corporate-muted">
              Create credentials and assign role-based access for this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-corporate-border p-2 text-corporate-muted hover:bg-corporate-bg"
            aria-label="Close add user dialog"
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
            className="rounded-full border border-corporate-border px-5 py-2.5 text-sm font-semibold text-corporate-text hover:bg-corporate-bg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={cn(
              "btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            )}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}
