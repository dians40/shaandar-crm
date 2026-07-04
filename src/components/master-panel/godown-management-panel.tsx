"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Warehouse } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { useGodowns } from "@/hooks/use-godowns";
import { EMPTY_GODOWN_FORM, type GodownRecord } from "@/types/godown";

type ViewMode = "list" | "add" | "edit";

export default function GodownManagementPanel() {
  const { godowns, isReady, addGodown, updateGodown, removeGodown } = useGodowns();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_GODOWN_FORM);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setForm(EMPTY_GODOWN_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openEdit = (record: GodownRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      code: record.code,
      address: record.address,
      city: record.city,
      pinCode: record.pinCode,
      managerName: record.managerName,
      contactPhone: record.contactPhone,
      isActive: record.isActive,
      notes: record.notes,
    });
    setView("edit");
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError("Godown name and code are required.");
      return;
    }

    if (view === "edit" && editingId) {
      updateGodown(editingId, form);
    } else {
      addGodown(form);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: GodownRecord) => {
    if (!window.confirm(`Remove godown "${record.name}"?`)) return;
    removeGodown(record.id);
  };

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading godowns...
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">
            {view === "add" ? "Add Godown" : "Edit Godown"}
          </h2>
          <p className="text-sm text-corporate-muted">
            Structured for future item-entry linkage (code, location, manager).
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Godown Name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextInput
            label="Godown Code"
            required
            hint="Unique code for item systems"
            value={form.code}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
            }
          />
          <TextInput
            label="City"
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
          />
          <TextInput
            label="Pin Code"
            value={form.pinCode}
            onChange={(e) => setForm((prev) => ({ ...prev, pinCode: e.target.value }))}
          />
          <TextInput
            label="Manager Name"
            value={form.managerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, managerName: e.target.value }))
            }
          />
          <TextInput
            label="Contact Phone"
            value={form.contactPhone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
            }
          />
          <div className="sm:col-span-2">
            <TextInput
              label="Address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaInput
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <SelectInput
            label="Status"
            value={form.isActive ? "active" : "inactive"}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))
            }
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
          >
            Save Godown
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setView("list");
            }}
            className="rounded-lg border border-corporate-border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">Godown List</h2>
          <p className="text-sm text-corporate-muted">
            Manage warehouse locations for labor and inventory linkage.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Add Godown
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <table className="min-w-full divide-y divide-corporate-border">
          <thead className="bg-corporate-bg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                City
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Manager
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {godowns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Warehouse className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  No godowns yet. Click Add Godown to create one.
                </td>
              </tr>
            ) : (
              godowns.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.code}</td>
                  <td className="px-4 py-3 text-sm">{row.city || "—"}</td>
                  <td className="px-4 py-3 text-sm">{row.managerName || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Godown
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove Godown
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
