"use client";

import { useMemo, useState } from "react";
import { Calculator, Pencil, Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesListSearch } from "@/lib/list-search-filter";
import {
  EMPTY_UNIT_CONVERSION_FORM,
  formatConversionFormula,
  validateUnitConversionForm,
  type UnitConversionRecord,
} from "@/types/unit-conversion";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListSearchBar from "./module-list-search-bar";

type ViewMode = "list" | "add" | "edit";

export default function UnitConversionManagementPanel() {
  const { units, unitOptions, isReady: unitsReady } = useUnits();
  const { conversions, isReady, addConversion, updateConversion, removeConversion } =
    useUnitConversions();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_UNIT_CONVERSION_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversions = useMemo(
    () =>
      conversions.filter((row) =>
        matchesListSearch(searchQuery, [
          row.mainUnitName,
          row.subUnitName,
          row.id,
          String(row.conversionFactor),
          formatConversionFormula(row.mainUnitName, row.conversionFactor, row.subUnitName),
        ])
      ),
    [conversions, searchQuery]
  );

  const formulaPreview = useMemo(() => {
    if (!form.mainUnitName || !form.subUnitName || !form.conversionFactor) {
      return "Select units and enter a factor to preview the formula.";
    }
    return formatConversionFormula(
      form.mainUnitName,
      form.conversionFactor,
      form.subUnitName
    );
  }, [form.mainUnitName, form.subUnitName, form.conversionFactor]);

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
    setForm({
      mainUnitId: record.mainUnitId,
      mainUnitName: record.mainUnitName,
      conversionFactor: record.conversionFactor,
      subUnitId: record.subUnitId,
      subUnitName: record.subUnitName,
    });
    setView("edit");
  };

  const handleMainUnitChange = (unitId: string) => {
    const unit = units.find((row) => row.id === unitId);
    setForm((prev) => ({
      ...prev,
      mainUnitId: unitId,
      mainUnitName: unit?.name ?? "",
    }));
  };

  const handleSubUnitChange = (unitId: string) => {
    const unit = units.find((row) => row.id === unitId);
    setForm((prev) => ({
      ...prev,
      subUnitId: unitId,
      subUnitName: unit?.name ?? "",
    }));
  };

  const handleSave = () => {
    const validationError = validateUnitConversionForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...form,
      conversionFactor: Number(form.conversionFactor) || 0,
    };

    if (view === "edit" && editingId) {
      updateConversion(editingId, payload);
    } else {
      addConversion(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: UnitConversionRecord) => {
    if (
      !window.confirm(
        `Remove conversion "${formatConversionFormula(record.mainUnitName, record.conversionFactor, record.subUnitName)}"?`
      )
    ) {
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
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Conversion" : "Edit / Modify Conversion"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Map unit relationships for stock and accounting calculations.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput
              label="Main Unit (From)"
              required
              value={form.mainUnitId}
              placeholder="Select main unit"
              options={unitOptions}
              onChange={(e) => handleMainUnitChange(e.target.value)}
              hint="e.g. Peti, Box, Carton"
            />
            <TextInput
              label="Conversion Factor / Multiplier"
              required
              type="number"
              min="0.0001"
              step="any"
              value={String(form.conversionFactor)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  conversionFactor: Number(e.target.value) || 0,
                }))
              }
              hint="How many sub-units equal 1 main unit"
            />
            <SelectInput
              label="Sub-Unit (To)"
              required
              value={form.subUnitId}
              placeholder="Select sub-unit"
              options={unitOptions}
              onChange={(e) => handleSubUnitChange(e.target.value)}
              hint="e.g. Pieces, KG, Liter"
            />
            <div className="sm:col-span-2 rounded-lg border border-corporate-brand/30 bg-corporate-brand-light/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
                Formula Preview
              </p>
              <p className="mt-1 text-base font-semibold text-corporate-text">{formulaPreview}</p>
              <p className="mt-1 text-xs text-corporate-muted">
                Example: 1 Peti = 24 Pieces — use this for flawless stock quantity math.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Conversion
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
          <h2 className="text-lg font-semibold text-corporate-text">Conversion List</h2>
          <p className="text-sm text-corporate-muted">
            Unit mapping engine for inventory and accounting quantity calculations.
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
                  Formula
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Main Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Sub-Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Factor
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
                    No conversions yet. Use Add Conversion to map units.
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
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatConversionFormula(
                        row.mainUnitName,
                        row.conversionFactor,
                        row.subUnitName
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.mainUnitName}</td>
                    <td className="px-4 py-3 text-sm">{row.subUnitName}</td>
                    <td className="px-4 py-3 text-sm">{row.conversionFactor}</td>
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
