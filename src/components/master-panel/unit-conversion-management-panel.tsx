"use client";

import { useCallback, useMemo, useState } from "react";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import { matchesUniversalNameSearch } from "@/lib/list-search-filter";
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
import UnitConversionList from "./unit-conversion-list";
import UniversalRecordProfile from "./universal-record-profile";

type ViewMode = "list" | "add" | "edit" | "detail";

function hydrateFormNames(
  form: UnitConversionFormState,
  unitNameById: Record<string, string>
): UnitConversionFormState {
  return {
    ...form,
    baseUnitName: form.baseUnitId
      ? unitNameById[form.baseUnitId] ?? form.baseUnitName
      : form.baseUnitName,
    intermediateUnitName: form.intermediateUnitId
      ? unitNameById[form.intermediateUnitId] ?? form.intermediateUnitName
      : form.intermediateUnitName,
    tertiaryUnitName: form.tertiaryUnitId
      ? unitNameById[form.tertiaryUnitId] ?? form.tertiaryUnitName
      : form.tertiaryUnitName,
    fourthUnitName: form.fourthUnitId
      ? unitNameById[form.fourthUnitId] ?? form.fourthUnitName
      : form.fourthUnitName,
  };
}

export default function UnitConversionManagementPanel() {
  const { units, unitOptions, isReady: unitsReady } = useUnits();
  const { conversions, isReady, addConversion, updateConversion, removeConversion } =
    useUnitConversions();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UnitConversionFormState>(EMPTY_UNIT_CONVERSION_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const unitNameById = useMemo(
    () => Object.fromEntries(units.map((unit) => [unit.id, unit.name])),
    [units]
  );

  const viewingRecord = useMemo(
    () => conversions.find((row) => row.id === viewingId) ?? null,
    [conversions, viewingId]
  );

  const filteredConversions = useMemo(
    () =>
      conversions.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.baseUnitName, [
          row.intermediateUnitName,
          row.tertiaryUnitName,
          row.fourthUnitName,
          row.id,
          row.totalBaseUnits != null ? String(row.totalBaseUnits) : "",
          formatChainShort(row, unitNameById),
          formatChainSummary(row, unitNameById),
        ])
      ),
    [conversions, searchQuery, unitNameById]
  );

  const canRemove = useCallback(
    (record: UnitConversionRecord) =>
      !checkUsedInTransactions("unit-conversion", record.id, record.baseUnitName),
    [checkUsedInTransactions]
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

  const openView = (record: UnitConversionRecord) => {
    setViewingId(record.id);
    setView("detail");
  };

  const openEdit = (record: UnitConversionRecord) => {
    setEditingId(record.id);
    setForm(recordToFormState(record));
    setView("edit");
  };

  const handleSave = () => {
    const hydratedForm = hydrateFormNames(form, unitNameById);
    const validationError = validateUnitConversionForm(hydratedForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildConversionPayload(hydratedForm);

    if (view === "edit" && editingId) {
      updateConversion(editingId, payload);
    } else {
      addConversion(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: UnitConversionRecord) => {
    if (!canRemove(record)) return;
    if (!window.confirm(`Remove conversion "${formatChainShort(record, unitNameById)}"?`)) {
      return;
    }
    removeConversion(record.id);
  };

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Conversion"
      active={subTab}
      onList={() => {
        resetForm();
        setViewingId(null);
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

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.baseUnitName}
          subtitle="Unit Conversion Chain Profile"
          fields={[
            { label: "Level 1 — Main Unit", value: viewingRecord.baseUnitName },
            { label: "Multiplier 1", value: viewingRecord.firstMultiplier },
            { label: "Level 2 — Secondary Unit", value: viewingRecord.intermediateUnitName },
            { label: "Multiplier 2", value: viewingRecord.secondMultiplier },
            { label: "Level 3 — Tertiary Unit", value: viewingRecord.tertiaryUnitName },
            { label: "Multiplier 3", value: viewingRecord.thirdMultiplier },
            { label: "Level 4 — Fourth Unit", value: viewingRecord.fourthUnitName },
            {
              label: "Chain Summary",
              value: formatChainSummary(viewingRecord, unitNameById),
            },
            {
              label: "Short Formula",
              value: formatChainShort(viewingRecord, unitNameById),
            },
            {
              label: "Total",
              value: formatTotalBaseUnits(viewingRecord, unitNameById),
            },
          ]}
          onBack={() => {
            setViewingId(null);
            setView("list");
          }}
          onEdit={() => openEdit(viewingRecord)}
        />
      </>
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
          unitNameById={unitNameById}
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
          unitNameById={unitNameById}
          canRemove={canRemove}
          onView={openView}
          onEdit={openEdit}
          onRemove={handleRemove}
        />
      </div>
    </>
  );
}
