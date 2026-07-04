"use client";

import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { useEmployeeGroups } from "@/hooks/use-employee-groups";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  EMPTY_EMPLOYEE_GROUP_FORM,
  resolveEmployeeGroupContractor,
  validateEmployeeGroupForm,
  type EmployeeGroupRecord,
} from "@/types/employee-group";
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

export default function EmployeeGroupManagementPanel() {
  const { groups, isReady, addGroup, updateGroup, removeGroup } = useEmployeeGroups();
  const { contractorOptions, isReady: settingsReady } = useGeneralSettings();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_EMPLOYEE_GROUP_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => groups.find((row) => row.id === viewingId) ?? null,
    [groups, viewingId]
  );

  const filtered = useMemo(
    () =>
      groups.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.groupName, [
          row.contractorName,
          row.customContractorNote,
          resolveEmployeeGroupContractor(row),
        ])
      ),
    [groups, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_EMPLOYEE_GROUP_FORM);
    setEditingId(null);
    setError(null);
  };

  const openEdit = (record: EmployeeGroupRecord) => {
    setEditingId(record.id);
    setForm({
      groupName: record.groupName,
      contractorName: record.contractorName,
      customContractorNote: record.customContractorNote,
    });
    setView("edit");
  };

  const handleSave = () => {
    const editingName = editingId
      ? groups.find((group) => group.id === editingId)?.groupName
      : undefined;
    const validationError = validateEmployeeGroupForm(
      form,
      groups.map((group) => group.groupName),
      editingName
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      groupName: form.groupName.trim(),
      contractorName: form.contractorName,
      customContractorNote: form.customContractorNote.trim(),
    };

    if (view === "edit" && editingId) {
      updateGroup(editingId, payload);
    } else {
      addGroup(payload);
    }
    resetForm();
    setView("list");
  };

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Employee Group"
      active={view === "add" ? "add" : "list"}
      onList={() => {
        resetForm();
        setViewingId(null);
        setView("list");
      }}
      onAdd={() => {
        resetForm();
        setView("add");
      }}
    />
  );

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading Employee Groups...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.groupName}
          subtitle="Labor group linked to contractor assignment"
          fields={[
            {
              label: "Contractor",
              value: resolveEmployeeGroupContractor(viewingRecord),
            },
            {
              label: "Standard Contractor",
              value: viewingRecord.contractorName || "—",
            },
            {
              label: "Custom Contractor Note",
              value: viewingRecord.customContractorNote || "—",
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
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Employee Group" : "Edit Employee Group"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Create labor categories mapped to contractor assignments.
            </p>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Employee Group Name"
              required
              value={form.groupName}
              onChange={(e) => setForm((p) => ({ ...p, groupName: e.target.value }))}
            />
            <SelectInput
              label="Contractor Name"
              value={form.contractorName}
              placeholder={settingsReady ? "Select contractor" : "Loading contractors..."}
              options={contractorOptions}
              onChange={(e) =>
                setForm((p) => ({ ...p, contractorName: e.target.value }))
              }
            />
            <div className="sm:col-span-2">
              <TextInput
                label="Custom Contractor Parameter"
                value={form.customContractorNote}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customContractorNote: e.target.value }))
                }
                hint="Optional override or additional contractor detail when not covered by the standard list."
              />
            </div>
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
      <UniversalMasterListShell
        moduleName="Employee Group"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Employee Group List"
        subtitle="Labor categories linked to contractor assignments."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Group Name</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Contractor</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <UsersRound className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  {searchQuery.trim() ? LIST_SEARCH_EMPTY_MESSAGE : "No employee groups yet."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={row.groupName}
                    onEdit={() => openEdit(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {resolveEmployeeGroupContractor(row)}
                  </td>
                  <UniversalMasterListActionsCell>
                    <ModuleListActionGroup
                      onView={() => {
                        setViewingId(row.id);
                        setView("detail");
                      }}
                      onEdit={() => openEdit(row)}
                      extra={
                        <MasterRemoveOrProtected
                          canRemove={
                            !checkUsedInTransactions("employee-group", row.id, row.groupName)
                          }
                          onRemove={() => {
                            if (
                              !window.confirm(`Remove employee group "${row.groupName}"?`)
                            ) {
                              return;
                            }
                            removeGroup(row.id);
                          }}
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
