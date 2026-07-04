"use client";

import { useMemo, useState } from "react";
import { FolderTree, Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useItemGroups } from "@/hooks/use-item-groups";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import { selectMasterPanelEntity } from "@/lib/master-panel-entity-bridge";
import {
  EMPTY_ITEM_GROUP_FORM,
  ITEM_GROUP_PRIMARY_PARENT,
  validateItemGroupForm,
  type ItemGroupRecord,
} from "@/types/item-group";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import ModuleListSearchBar from "./module-list-search-bar";
import UniversalRecordProfile from "./universal-record-profile";

type ViewMode = "list" | "add" | "edit" | "detail";

export default function ItemGroupsManagementPanel() {
  const { groups, parentOptions, isReady, addGroup, updateGroup, removeGroup } =
    useItemGroups();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_ITEM_GROUP_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => groups.find((row) => row.id === viewingId) ?? null,
    [groups, viewingId]
  );

  const parentDropdownOptions = useMemo(
    () =>
      parentOptions.map((name) => ({
        value: name,
        label: name === ITEM_GROUP_PRIMARY_PARENT ? "Primary (Top Level)" : name,
      })),
    [parentOptions]
  );

  const filteredGroups = useMemo(
    () =>
      groups.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.name, [row.id, row.parentGroup])
      ),
    [groups, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_ITEM_GROUP_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openView = (record: ItemGroupRecord) => {
    setViewingId(record.id);
    setView("detail");
  };

  const openEdit = (record: ItemGroupRecord) => {
    setEditingId(record.id);
    setForm({ name: record.name, parentGroup: record.parentGroup });
    setView("edit");
  };

  const handleSave = () => {
    const editingName = editingId
      ? groups.find((group) => group.id === editingId)?.name
      : undefined;
    const validationError = validateItemGroupForm(
      form,
      groups.map((group) => group.name),
      editingName
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = { ...form, name: form.name.trim() };

    if (view === "edit" && editingId) {
      updateGroup(editingId, payload);
    } else {
      addGroup(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: ItemGroupRecord) => {
    if (!window.confirm(`Remove item group "${record.name}"?`)) return;
    removeGroup(record.id);
  };

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Item Group"
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
        Loading item groups...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.name}
          subtitle="Item Group Profile"
          fields={[
            { label: "Parent Group", value: viewingRecord.parentGroup },
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
              {view === "add" ? "Add Item Group" : "Edit Item Group"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Organize products into hierarchical item categories.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Group Name"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <SelectInput
              label="Parent Group"
              required
              value={form.parentGroup}
              options={parentDropdownOptions}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, parentGroup: e.target.value }))
              }
              hint="Select Primary for top-level or choose an existing group"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Item Group
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
          <h2 className="text-lg font-semibold text-corporate-text">Item Groups List</h2>
          <p className="text-sm text-corporate-muted">
            Product category hierarchy for the items master.
          </p>
        </div>

        <ModuleListSearchBar
          moduleName="Item Group"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
          <table className="min-w-full divide-y divide-corporate-border">
            <thead className="bg-corporate-bg">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Group Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Parent Group
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    <FolderTree className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    No item groups yet. Use Add Item Group to create one.
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    {LIST_SEARCH_EMPTY_MESSAGE}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-sm">{row.parentGroup}</td>
                    <td className="px-4 py-3 text-right">
                      <ModuleListActionGroup
                        onView={() => openView(row)}
                        onSelect={() =>
                          selectMasterPanelEntity({
                            entityType: "item-group",
                            entityId: row.id,
                            entityName: row.name,
                            sourceModuleId: "item-groups",
                          })
                        }
                        onEdit={() => openEdit(row)}
                        extra={
                          <button
                            type="button"
                            onClick={() => handleRemove(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        }
                      />
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
