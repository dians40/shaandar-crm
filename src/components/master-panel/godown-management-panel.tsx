"use client";

import { useMemo, useState } from "react";
import { Warehouse } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useGodowns } from "@/hooks/use-godowns";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import { EMPTY_GODOWN_FORM, type GodownRecord } from "@/types/godown";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
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

export default function GodownManagementPanel() {
  const { godowns, isReady, addGodown, updateGodown, removeGodown } = useGodowns();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_GODOWN_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => godowns.find((row) => row.id === viewingId) ?? null,
    [godowns, viewingId]
  );

  const filteredGodowns = useMemo(
    () =>
      godowns.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.name, [
          row.id,
          row.code,
          row.city,
          row.managerName,
        ])
      ),
    [godowns, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_GODOWN_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openView = (record: GodownRecord) => {
    setViewingId(record.id);
    setView("detail");
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
    if (checkUsedInTransactions("godown", record.id, record.name)) {
      setError("This godown cannot be removed because it is used in transactions.");
      return;
    }
    if (!window.confirm(`Remove godown "${record.name}"?`)) return;
    removeGodown(record.id);
  };

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Godown"
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
        Loading godowns...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.name}
          subtitle={`Code: ${viewingRecord.code} · Godown Profile`}
          fields={[
            { label: "Code", value: viewingRecord.code },
            { label: "Address", value: viewingRecord.address },
            { label: "City", value: viewingRecord.city },
            { label: "PIN Code", value: viewingRecord.pinCode },
            { label: "Manager", value: viewingRecord.managerName },
            { label: "Contact Phone", value: viewingRecord.contactPhone },
            { label: "Active", value: viewingRecord.isActive },
            { label: "Notes", value: viewingRecord.notes },
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
      </>
    );
  }

  return (
    <>
      {tabBar}
      <UniversalMasterListShell
        moduleName="Godown"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Godown List"
        subtitle="Manage warehouse locations for labor and inventory linkage."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Name</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Code</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>City</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Manager</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {godowns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Warehouse className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  No godowns yet. Use Add Godown to create one.
                </td>
              </tr>
            ) : filteredGodowns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  {LIST_SEARCH_EMPTY_MESSAGE}
                </td>
              </tr>
            ) : (
              filteredGodowns.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={row.name}
                    onEdit={() => openEdit(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.code}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.city || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.managerName || "—"}</td>
                  <UniversalMasterListActionsCell>
                    <ModuleListActionGroup
                      onView={() => openView(row)}
                      onEdit={() => openEdit(row)}
                      editLabel="Edit Godown"
                      extra={
                        <MasterRemoveOrProtected
                          canRemove={
                            !checkUsedInTransactions("godown", row.id, row.name)
                          }
                          onRemove={() => handleRemove(row)}
                          label="Remove Godown"
                        />
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
