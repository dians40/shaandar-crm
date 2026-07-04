"use client";

import { useMemo, useState } from "react";
import { Calculator, Pencil, Trash2 } from "lucide-react";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesListSearch } from "@/lib/list-search-filter";
import {
  buildConversionPayload,
  EMPTY_UNIT_CONVERSION_FORM,
  formatChainShort,
  formatChainSummary,
  formatTotalBaseUnits,
  recordToFormState,
  validateUnitConversionForm,
  type UnitConversionFormState,
  type UnitConversionRecord,
} from "@/types/unit-conversion";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListSearchBar from "./module-list-search-bar";
import UnitConversionForm from "./unit-conversion-form";

type ViewMode = "list" | "add" | "edit";

export default function UnitConversionManagementPanel() {
  const { units, unitOptions, isReady: unitsReady } = useUnits();
  const { conversions, isReady, addConversion, updateConversion, removeConversion } =
    useUnitConversions();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UnitConversionFormState>(EMPTY_UNIT_CONVERSION_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversions = useMemo(
    () =>
      conversions.filter((row) =>
        matchesListSearch(searchQuery, [
          row.baseUnitName,
          row.intermediateUnitName,
          row.finalUnitName,
          row.id,
          row.totalBaseUnits != null ? String(row.totalBaseUnits) : "",
          formatChainShort(row),
          formatChainSummary(row),
        ])
      ),
    [conversions, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_UNIT_CONVERSION_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openEdit = (record: UnitConversionRecord) => {
    setEditingId(record.id);
    setForm(recordToFormState(record));
    setView("edit");
  };

  const handleSave = () => {
    const validationError = validateUnitConversionForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildConversionPayload(form);

    if (view === "edit" && editingId) {
      updateConversion(editingId, payload);
    } else {
      addConversion(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: UnitConversionRecord) => {
    if (!window.confirm(`Remove conversion "${formatChainShort(record)}"?`)) {
      return;
    }
    removeConversion(record.id);
  };

  const subTab: "list" | "add" = view === "list" ? "list" : "add";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Conversion"
      active={subTab}
      onList={() => {
        resetForm();
        setView("list");
      }}
      onAdd={openAdd}
    />
  );

  if (!isReady || !unitsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading unit conversions...
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <>
        {tabBar}
        <UnitConversionForm
          form={form}
          unitOptions={unitOptions}
          units={units}
          error={error}
          isEdit={view === "edit"}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => {
            resetForm();
            setView("list");
          }}
        />
      </>
    );
  }

  return (
    <>
      {tabBar}
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">Conversion List</h2>
          <p className="text-sm text-corporate-muted">
            Flexible unit conversions — from simple 1-step to multi-level chains.
          </p>
        </div>

        <ModuleListSearchBar
          moduleName="Conversion"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
          <table className="min-w-full divide-y divide-corporate-border">
            <thead className="bg-corporate-bg">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Main Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Chain Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Short Formula
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    <Calculator className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    No conversions yet. Use Add Conversion to map unit chains.
                  </td>
                </tr>
              ) : filteredConversions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    {LIST_SEARCH_EMPTY_MESSAGE}
                  </td>
                </tr>
              ) : (
                filteredConversions.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                      {row.baseUnitName}
                    </td>
                    <td className="max-w-md px-4 py-3 text-sm">{formatChainSummary(row)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                      {formatChainShort(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {formatTotalBaseUnits(row)}
                    </td>
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
                        <button
                          type="button"
                          onClick={() => handleRemove(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    </>
  );
}
