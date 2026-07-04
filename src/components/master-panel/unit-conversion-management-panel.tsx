"use client";

import { useMemo, useState } from "react";
import { Calculator, Pencil, Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesListSearch } from "@/lib/list-search-filter";
import {
  computeTotalBaseUnits,
  EMPTY_UNIT_CONVERSION_FORM,
  formatChainShort,
  formatChainSummary,
  validateUnitConversionForm,
  type UnitConversionRecord,
} from "@/types/unit-conversion";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListSearchBar from "./module-list-search-bar";

type ViewMode = "list" | "add" | "edit";

const TERTIARY_NONE = "__none__";

export default function UnitConversionManagementPanel() {
  const { units, unitOptions, isReady: unitsReady } = useUnits();
  const { conversions, isReady, addConversion, updateConversion, removeConversion } =
    useUnitConversions();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_UNIT_CONVERSION_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const tertiarySelectOptions = useMemo(
    () => [
      { value: TERTIARY_NONE, label: "None (3-level chain)" },
      ...unitOptions,
    ],
    [unitOptions]
  );

  const hasTertiaryTier = Boolean(form.tertiaryUnitId?.trim());

  const previewTotal = useMemo(
    () =>
      computeTotalBaseUnits(
        form.firstMultiplier,
        form.secondMultiplier,
        form.thirdMultiplier,
        hasTertiaryTier
      ),
    [form.firstMultiplier, form.secondMultiplier, form.thirdMultiplier, hasTertiaryTier]
  );

  const chainSummary = useMemo(() => {
    if (!form.baseUnitName || !form.intermediateUnitName || !form.finalUnitName) {
      return "Select units and multipliers to preview the chain calculation.";
    }

    return formatChainSummary({
      baseUnitName: form.baseUnitName,
      firstMultiplier: form.firstMultiplier,
      intermediateUnitName: form.intermediateUnitName,
      secondMultiplier: form.secondMultiplier,
      tertiaryUnitId: form.tertiaryUnitId,
      tertiaryUnitName: form.tertiaryUnitName,
      thirdMultiplier: form.thirdMultiplier,
      finalUnitName: form.finalUnitName,
      totalBaseUnits: previewTotal,
    });
  }, [form, previewTotal]);

  const filteredConversions = useMemo(
    () =>
      conversions.filter((row) =>
        matchesListSearch(searchQuery, [
          row.baseUnitName,
          row.intermediateUnitName,
          row.tertiaryUnitName,
          row.finalUnitName,
          row.id,
          String(row.totalBaseUnits),
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
    setForm({
      baseUnitId: record.baseUnitId,
      baseUnitName: record.baseUnitName,
      firstMultiplier: record.firstMultiplier,
      intermediateUnitId: record.intermediateUnitId,
      intermediateUnitName: record.intermediateUnitName,
      secondMultiplier: record.secondMultiplier,
      tertiaryUnitId: record.tertiaryUnitId,
      tertiaryUnitName: record.tertiaryUnitName,
      thirdMultiplier: record.thirdMultiplier,
      finalUnitId: record.finalUnitId,
      finalUnitName: record.finalUnitName,
    });
    setView("edit");
  };

  const setUnitField = (
    field: "base" | "intermediate" | "tertiary" | "final",
    unitId: string
  ) => {
    const unit = units.find((row) => row.id === unitId);
    const name = unit?.name ?? "";

    if (field === "base") {
      setForm((prev) => ({ ...prev, baseUnitId: unitId, baseUnitName: name }));
      return;
    }
    if (field === "intermediate") {
      setForm((prev) => ({
        ...prev,
        intermediateUnitId: unitId,
        intermediateUnitName: name,
      }));
      return;
    }
    if (field === "tertiary") {
      if (!unitId || unitId === TERTIARY_NONE) {
        setForm((prev) => ({
          ...prev,
          tertiaryUnitId: "",
          tertiaryUnitName: "",
          thirdMultiplier: 1,
        }));
        return;
      }
      setForm((prev) => ({
        ...prev,
        tertiaryUnitId: unitId,
        tertiaryUnitName: name,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, finalUnitId: unitId, finalUnitName: name }));
  };

  const handleSave = () => {
    const validationError = validateUnitConversionForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const hasTier = Boolean(form.tertiaryUnitId?.trim());
    const payload = {
      ...form,
      firstMultiplier: Number(form.firstMultiplier) || 0,
      secondMultiplier: Number(form.secondMultiplier) || 0,
      thirdMultiplier: hasTier ? Number(form.thirdMultiplier) || 0 : 1,
      tertiaryUnitId: hasTier ? form.tertiaryUnitId : "",
      tertiaryUnitName: hasTier ? form.tertiaryUnitName : "",
      totalBaseUnits: computeTotalBaseUnits(
        form.firstMultiplier,
        form.secondMultiplier,
        form.thirdMultiplier,
        hasTier
      ),
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
    if (!window.confirm(`Remove chain conversion "${formatChainShort(record)}"?`)) {
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
              Multi-level chain format for complex inventory unit hierarchies.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput
              label="Base Unit / Main Unit"
              required
              value={form.baseUnitId}
              placeholder="Select base unit"
              options={unitOptions}
              onChange={(e) => setUnitField("base", e.target.value)}
              hint="e.g. Carton, Peti, Box"
            />
            <TextInput
              label="First Multiplier"
              required
              type="number"
              min="0.0001"
              step="any"
              value={String(form.firstMultiplier)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  firstMultiplier: Number(e.target.value) || 0,
                }))
              }
              hint="How many intermediate units in 1 base unit"
            />
            <SelectInput
              label="Intermediate Unit (Sub-Unit)"
              required
              value={form.intermediateUnitId}
              placeholder="Select intermediate unit"
              options={unitOptions}
              onChange={(e) => setUnitField("intermediate", e.target.value)}
              hint="e.g. Packet, Dozen"
            />
            <TextInput
              label="Second Multiplier"
              required
              type="number"
              min="0.0001"
              step="any"
              value={String(form.secondMultiplier)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  secondMultiplier: Number(e.target.value) || 0,
                }))
              }
              hint="Units per intermediate (or per tertiary if 4-level)"
            />
            <SelectInput
              label="Third Level Unit (Optional — 4-step chain)"
              value={form.tertiaryUnitId || TERTIARY_NONE}
              options={tertiarySelectOptions}
              onChange={(e) => setUnitField("tertiary", e.target.value)}
              hint="Enable for Pallet → Carton → Packet → Pieces style chains"
            />
            {hasTertiaryTier && (
              <TextInput
                label="Third Multiplier"
                required
                type="number"
                min="0.0001"
                step="any"
                value={String(form.thirdMultiplier)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    thirdMultiplier: Number(e.target.value) || 0,
                  }))
                }
              />
            )}
            <SelectInput
              label="Final Lowest Unit (Base Pieces)"
              required
              value={form.finalUnitId}
              placeholder="Select final unit"
              options={unitOptions}
              onChange={(e) => setUnitField("final", e.target.value)}
              hint="e.g. Pieces, Gram, Numbers"
            />
            <div className="sm:col-span-2 rounded-lg border border-corporate-brand/30 bg-corporate-brand-light/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
                Chain Calculation Guide
              </p>
              <p className="mt-2 text-sm leading-relaxed text-corporate-text">{chainSummary}</p>
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
            Multi-level unit chains for inventory and accounting calculations.
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
                  Chain Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Short Formula
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Total Base Units
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    <Calculator className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    No conversions yet. Use Add Conversion to map unit chains.
                  </td>
                </tr>
              ) : filteredConversions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    {LIST_SEARCH_EMPTY_MESSAGE}
                  </td>
                </tr>
              ) : (
                filteredConversions.map((row) => (
                  <tr key={row.id}>
                    <td className="max-w-md px-4 py-3 text-sm">{formatChainSummary(row)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                      {formatChainShort(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {row.totalBaseUnits.toLocaleString("en-IN")} {row.finalUnitName}
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
