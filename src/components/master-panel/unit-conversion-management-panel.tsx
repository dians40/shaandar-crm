"use client";

import { useMemo, useState } from "react";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import { matchesListSearch } from "@/lib/list-search-filter";
import {
  buildConversionPayload,
  EMPTY_UNIT_CONVERSION_FORM,
  formatChainShort,
  formatChainSummary,
  recordToFormState,
  validateUnitConversionForm,
  type UnitConversionFormState,
  type UnitConversionRecord,
} from "@/types/unit-conversion";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListSearchBar from "./module-list-search-bar";
import UnitConversionForm from "./unit-conversion-form";
import UnitConversionList from "./unit-conversion-list";

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

        <UnitConversionList
          conversions={conversions}
          filteredConversions={filteredConversions}
          onEdit={openEdit}
          onRemove={handleRemove}
        />
      </div>
    </>
  );
}
