"use client";

import { useMemo, useState } from "react";
import { FolderTree } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useItemGroups } from "@/hooks/use-item-groups";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  EMPTY_ITEM_GROUP_FORM,
  ITEM_GROUP_PRIMARY_PARENT,
  validateItemGroupForm,
  type ItemGroupRecord,
} from "@/types/item-group";
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
  useMasterListFilters,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "edit" | "detail";

export default function ItemGroupsManagementPanel() {
  const { groups, parentOptions, isReady, addGroup, updateGroup, removeGroup } =
    useItemGroups();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
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
    if (checkUsedInTransactions("item-group", record.id, record.name)) {
      setError("This item group cannot be removed because it is used by items.");
      return;
    }
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
      <UniversalMasterListShell
        moduleName="Item Group"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Item Groups List"
        subtitle="Product category hierarchy for the items master."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Group Name</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Parent Group</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            <ItemGroupsListBody
              groups={groups}
              onEdit={openEdit}
              onView={openView}
              onRemove={handleRemove}
              checkUsedInTransactions={checkUsedInTransactions}
            />
          </tbody>
        </UniversalMasterListTable>
      </UniversalMasterListShell>
    </>
  );
}

type ItemGroupsListBodyProps = {
  groups: ItemGroupRecord[];
  onEdit: (record: ItemGroupRecord) => void;
  onView: (record: ItemGroupRecord) => void;
  onRemove: (record: ItemGroupRecord) => void;
  checkUsedInTransactions: ReturnType<typeof useMasterDeletionGuard>["checkUsedInTransactions"];
};

function ItemGroupsListBody({
  groups,
  onEdit,
  onView,
  onRemove,
  checkUsedInTransactions,
}: ItemGroupsListBodyProps) {
  const { searchQuery, departmentFilter, designationFilter } = useMasterListFilters();
  const filteredGroups = useMemo(
    () =>
      groups.filter((row) =>
        matchesUniversalNameSearch(
          searchQuery,
          row.name,
          [row.id, row.parentGroup],
          {
            departmentFilter,
            designationFilter,
            skipDepartmentIfAbsent: true,
            skipDesignationIfAbsent: true,
          }
        )
      ),
    [groups, searchQuery, departmentFilter, designationFilter]
  );

  if (groups.length === 0) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
          <FolderTree className="mx-auto mb-2 h-6 w-6 opacity-60" />
          No item groups yet. Use Add Item Group to create one.
        </td>
      </tr>
    );
  }

  if (filteredGroups.length === 0) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
          {LIST_SEARCH_EMPTY_MESSAGE}
        </td>
      </tr>
    );
  }

  return (
    <>
      {filteredGroups.map((row) => (
        <UniversalMasterListRow key={row.id} onEdit={() => onEdit(row)}>
          <UniversalMasterListNameCell name={row.name} onEdit={() => onEdit(row)} />
          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.parentGroup}</td>
          <UniversalMasterListActionsCell>
            <ModuleListActionGroup
              onView={() => onView(row)}
              onEdit={() => onEdit(row)}
              extra={
                <MasterRemoveOrProtected
                  canRemove={!checkUsedInTransactions("item-group", row.id, row.name)}
                  onRemove={() => onRemove(row)}
                />
              }
            />
          </UniversalMasterListActionsCell>
        </UniversalMasterListRow>
      ))}
    </>
  );
}
