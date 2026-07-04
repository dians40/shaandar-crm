"use client";

import { useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import { TextInput } from "@/components/forms/form-fields";
import { formatUnitLabel } from "@/constants/units";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useUnits } from "@/hooks/use-units";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  EMPTY_UNIT_FORM,
  validateUnitForm,
  type UnitRecord,
} from "@/types/unit";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import UniversalRecordProfile from "./universal-record-profile";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  UniversalMasterListActionsCell,
  UniversalMasterListNameCell,
  UniversalMasterListRow,
  UniversalMasterListShell,
  UniversalMasterListTable,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "edit" | "detail";

export default function UnitsManagementPanel() {
  const { units, isReady, addUnit, updateUnit, removeUnit } = useUnits();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_UNIT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => units.find((row) => row.id === viewingId) ?? null,
    [units, viewingId]
  );

  const filteredUnits = useMemo(
    () =>
      units.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.name, [row.shortCode, row.id])
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

  const openView = (record: UnitRecord) => {
    setViewingId(record.id);
    setView("detail");
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
    if (checkUsedInTransactions("unit", record.id, record.name)) {
      setError("This unit cannot be removed because it is used in transactions or dependent masters.");
      return;
    }
    if (!window.confirm(`Remove unit "${formatUnitLabel(record)}"?`)) return;
    removeUnit(record.id);
  };

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Unit"
      active={subTab}
      onList={() => {
        resetForm();
        setViewingId(null);
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

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={formatUnitLabel(viewingRecord)}
          subtitle="Unit Profile"
          fields={[
            { label: "Unit Name", value: viewingRecord.name },
            { label: "Short Code", value: viewingRecord.shortCode },
            { label: "System Seed", value: viewingRecord.isSystemSeed },
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
      <UniversalMasterListShell
        moduleName="Unit"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Units List"
        subtitle="18 pre-seeded business units — add custom units as needed."
      >
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Unit</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Short Code</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
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
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={formatUnitLabel(row)}
                    onEdit={() => openEdit(row)}
                    suffix={
                      row.isSystemSeed ? (
                        <span className="ml-2 text-xs font-normal text-corporate-muted">
                          (System)
                        </span>
                      ) : undefined
                    }
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.shortCode}</td>
                  <UniversalMasterListActionsCell>
                    <ModuleListActionGroup
                      onView={() => openView(row)}
                      onEdit={() => openEdit(row)}
                      extra={
                        !row.isSystemSeed ? (
                          <MasterRemoveOrProtected
                            canRemove={
                              !checkUsedInTransactions("unit", row.id, row.name)
                            }
                            onRemove={() => handleRemove(row)}
                          />
                        ) : undefined
                      }
                    />
                  </UniversalMasterListActionsCell>
                </UniversalMasterListRow>
              ))
            )}
          </tbody>
        </UniversalMasterListTable>
      </UniversalMasterListShell>
    </>
  );
}
