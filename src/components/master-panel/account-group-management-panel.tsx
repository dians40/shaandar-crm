"use client";

import { useMemo, useState } from "react";
import { FolderTree } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useAccountGroups } from "@/hooks/use-account-groups";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import { selectMasterPanelEntity } from "@/lib/master-panel-entity-bridge";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import ModuleListSearchBar from "./module-list-search-bar";
import UniversalRecordProfile from "./universal-record-profile";
import {
  CATEGORY_FOR_NATURE,
  EMPTY_ACCOUNT_GROUP_FORM,
  NATURE_OPTIONS,
  validateAccountGroupForm,
  type AccountGroupNature,
  type AccountGroupRecord,
} from "@/types/account-group";

type ViewMode = "list" | "add" | "edit" | "detail";

export default function AccountGroupManagementPanel() {
  const { groups, parentOptions, isReady, addGroup, updateGroup, removeGroup } =
    useAccountGroups();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_ACCOUNT_GROUP_FORM);
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
        label: name === "Primary" ? "Primary (Top Level)" : name,
      })),
    [parentOptions]
  );

  const natureOptions = useMemo(
    () => NATURE_OPTIONS.map((nature) => ({ value: nature, label: nature })),
    []
  );

  const filteredGroups = useMemo(
    () =>
      groups.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.name, [
          row.id,
          row.parentGroup,
          row.nature,
          row.category,
        ])
      ),
    [groups, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_ACCOUNT_GROUP_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openView = (record: AccountGroupRecord) => {
    setViewingId(record.id);
    setView("detail");
  };

  const openEdit = (record: AccountGroupRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      parentGroup: record.parentGroup,
      nature: record.nature,
      category: record.category,
    });
    setView("edit");
  };

  const handleSave = () => {
    const editingName = editingId
      ? groups.find((group) => group.id === editingId)?.name
      : undefined;
    const validationError = validateAccountGroupForm(
      form,
      groups.map((group) => group.name),
      editingName
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      category: CATEGORY_FOR_NATURE[form.nature],
    };

    if (view === "edit" && editingId) {
      const existing = groups.find((group) => group.id === editingId);
      if (existing?.isSystemSeed) {
        updateGroup(editingId, {
          ...payload,
          name: existing.name,
        });
      } else {
        updateGroup(editingId, payload);
      }
    } else {
      addGroup(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: AccountGroupRecord) => {
    if (record.isSystemSeed) {
      setError("System balance-sheet heads cannot be removed.");
      return;
    }
    if (checkUsedInTransactions("account-group", record.id, record.name)) {
      setError("This account group cannot be removed because it is used by accounts.");
      return;
    }
    if (!window.confirm(`Remove account group "${record.name}"?`)) return;
    removeGroup(record.id);
  };

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading account groups...
      </div>
    );
  }

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Account Group"
      active={subTab}
      onList={() => {
        resetForm();
        setViewingId(null);
        setView("list");
      }}
      onAdd={openAdd}
    />
  );

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.name}
          subtitle="Account Group Profile"
          fields={[
            { label: "Parent Group", value: viewingRecord.parentGroup },
            { label: "Nature", value: viewingRecord.nature },
            { label: "Category", value: viewingRecord.category },
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
      ? groups.find((group) => group.id === editingId)
      : undefined;

    return (
      <>
        {tabBar}
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Account Group" : "Edit Account Group"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Balance sheet heads — Assets, Liabilities, Income, Expenses, and Revenue.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Name of Group"
              required
              value={form.name}
              disabled={Boolean(editingRecord?.isSystemSeed)}
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
              hint="Select Primary for top-level group or choose a parent head"
            />
            <SelectInput
              label="Nature"
              required
              value={form.nature}
              options={natureOptions}
              onChange={(e) => {
                const nature = e.target.value as AccountGroupNature;
                setForm((prev) => ({
                  ...prev,
                  nature,
                  category: CATEGORY_FOR_NATURE[nature],
                }));
              }}
            />
            <TextInput
              label="Category (Primary Group)"
              readOnly
              value={form.category}
              className="bg-corporate-bg"
              hint="Auto-set from nature — ASSETS, LIABILITIES, INCOME, EXPENSES, REVENUE"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Group
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
          <h2 className="text-lg font-semibold text-corporate-text">Account Group List</h2>
          <p className="text-sm text-corporate-muted">
            Foundation ledger hierarchy for accounts master and balance sheet reporting.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <ModuleListSearchBar
          moduleName="Account Group"
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
                  Parent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Nature
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    <FolderTree className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    No account groups yet.
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    {LIST_SEARCH_EMPTY_MESSAGE}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-medium">
                      {row.name}
                      {row.isSystemSeed && (
                        <span className="ml-2 text-xs text-corporate-muted">(System)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.parentGroup}</td>
                    <td className="px-4 py-3 text-sm">{row.nature}</td>
                    <td className="px-4 py-3 text-sm">{row.category}</td>
                    <td className="px-4 py-3 text-right">
                      <ModuleListActionGroup
                        onView={() => openView(row)}
                        onSelect={() =>
                          selectMasterPanelEntity({
                            entityType: "account-group",
                            entityId: row.id,
                            entityName: row.name,
                            sourceModuleId: "account-group",
                          })
                        }
                        onEdit={() => openEdit(row)}
                        editLabel="Edit"
                        extra={
                          !row.isSystemSeed ? (
                            <MasterRemoveOrProtected
                              canRemove={
                                !checkUsedInTransactions(
                                  "account-group",
                                  row.id,
                                  row.name
                                )
                              }
                              onRemove={() => handleRemove(row)}
                            />
                          ) : undefined
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
