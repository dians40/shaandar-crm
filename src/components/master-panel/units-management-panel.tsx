"use client";

import { useMemo, useState } from "react";
import { Pencil, Ruler, Trash2 } from "lucide-react";
import { TextInput } from "@/components/forms/form-fields";
import { formatUnitLabel } from "@/constants/units";
import { useUnits } from "@/hooks/use-units";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesListSearch } from "@/lib/list-search-filter";
import {
  EMPTY_UNIT_FORM,
  validateUnitForm,
  type UnitRecord,
} from "@/types/unit";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListSearchBar from "./module-list-search-bar";

type ViewMode = "list" | "add" | "edit";

export default function UnitsManagementPanel() {
  const { units, isReady, addUnit, updateUnit, removeUnit } = useUnits();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_UNIT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUnits = useMemo(
    () =>
      units.filter((row) =>
        matchesListSearch(searchQuery, [row.name, row.shortCode, row.id])
      ),
    [units, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_UNIT_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openEdit = (record: UnitRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      nameHindi: "",
      shortCode: record.shortCode,
    });
    setView("edit");
  };

  const handleSave = () => {
    const editingName = editingId
      ? units.find((unit) => unit.id === editingId)?.name
      : undefined;
    const validationError = validateUnitForm(
      form,
      units.map((unit) => unit.name),
      editingName
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      nameHindi: "",
      shortCode: form.shortCode.trim(),
    };

    if (view === "edit" && editingId) {
      updateUnit(editingId, payload);
    } else {
      addUnit(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: UnitRecord) => {
    if (record.isSystemSeed) {
      setError("System seed units cannot be removed.");
      return;
    }
    if (!window.confirm(`Remove unit "${formatUnitLabel(record)}"?`)) return;
    removeUnit(record.id);
  };

  const subTab: "list" | "add" = view === "list" ? "list" : "add";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Unit"
      active={subTab}
      onList={() => {
        resetForm();
        setView("list");
      }}
      onAdd={openAdd}
    />
  );

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading units...
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    const editingRecord = editingId
      ? units.find((unit) => unit.id === editingId)
      : undefined;

    return (
      <>
        {tabBar}
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Unit" : "Edit / Modify Unit"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Standard inventory and accounting units of measure.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Unit Name"
              required
              value={form.name}
              disabled={Boolean(editingRecord?.isSystemSeed)}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextInput
              label="Short Code"
              required
              hint="e.g. KG, Pcs, Box"
              value={form.shortCode}
              onChange={(e) => setForm((prev) => ({ ...prev, shortCode: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Unit
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
      </>
    );
  }

  return (
    <>
      {tabBar}
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">Units List</h2>
          <p className="text-sm text-corporate-muted">
            18 pre-seeded business units — add custom units as needed.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <ModuleListSearchBar
          moduleName="Unit"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
          <table className="min-w-full divide-y divide-corporate-border">
            <thead className="bg-corporate-bg">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Short Code
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    <Ruler className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    No units yet.
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    {LIST_SEARCH_EMPTY_MESSAGE}
                  </td>
                </tr>
              ) : (
                filteredUnits.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatUnitLabel(row)}
                      {row.isSystemSeed && (
                        <span className="ml-2 text-xs text-corporate-muted">(System)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.shortCode}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit / Modify
                        </button>
                        {!row.isSystemSeed && (
                          <button
                            type="button"
                            onClick={() => handleRemove(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
