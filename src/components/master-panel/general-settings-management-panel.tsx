"use client";

import { useMemo, useState } from "react";
import { Settings, Wrench } from "lucide-react";
import { TextInput } from "@/components/forms/form-fields";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import { cn } from "@/lib/utils";
import {
  EMPTY_GENERAL_SETTINGS_FORM,
  GENERAL_SETTINGS_SUB_TABS,
  validateGeneralSettingsName,
  type GeneralSettingsRecord,
  type GeneralSettingsSubMaster,
} from "@/types/general-settings";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  UniversalMasterListNameCell,
  UniversalMasterListRow,
  UniversalMasterListShell,
  UniversalMasterListTable,
  useMasterListFilters,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "edit";

type SubMasterConfig = {
  key: GeneralSettingsSubMaster;
  singularLabel: string;
  records: GeneralSettingsRecord[];
  addRecord: (name: string) => void | Promise<void>;
  updateRecord: (id: string, name: string) => void | Promise<void>;
  removeRecord: (id: string) => void | Promise<void>;
};

export default function GeneralSettingsManagementPanel() {
  const settings = useGeneralSettings();
  const [activeSubMaster, setActiveSubMaster] =
    useState<GeneralSettingsSubMaster>("contractors");
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_GENERAL_SETTINGS_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const subMasterConfig = useMemo<SubMasterConfig>(() => {
    switch (activeSubMaster) {
      case "employee-types":
        return {
          key: "employee-types",
          singularLabel: "Employee Type",
          records: settings.employeeTypes,
          addRecord: (name) => settings.addRecord("employeeTypes", name),
          updateRecord: (id, name) => settings.updateRecord("employeeTypes", id, name),
          removeRecord: (id) => settings.removeRecord("employeeTypes", id),
        };
      case "departments":
        return {
          key: "departments",
          singularLabel: "Department",
          records: settings.departments,
          addRecord: (name) => settings.addRecord("departments", name),
          updateRecord: (id, name) => settings.updateRecord("departments", id, name),
          removeRecord: (id) => settings.removeRecord("departments", id),
        };
      case "locations":
        return {
          key: "locations",
          singularLabel: "Location",
          records: settings.locations,
          addRecord: (name) => settings.addRecord("locations", name),
          updateRecord: (id, name) => settings.updateRecord("locations", id, name),
          removeRecord: (id) => settings.removeRecord("locations", id),
        };
      case "overtime-reasons":
        return {
          key: "overtime-reasons",
          singularLabel: "Overtime Reason",
          records: settings.overtimeReasons,
          addRecord: (name) => settings.addRecord("overtimeReasons", name),
          updateRecord: (id, name) => settings.updateRecord("overtimeReasons", id, name),
          removeRecord: (id) => settings.removeRecord("overtimeReasons", id),
        };
      default:
        return {
          key: "contractors",
          singularLabel: "Contractor",
          records: settings.contractors,
          addRecord: (name) => settings.addRecord("contractors", name),
          updateRecord: (id, name) => settings.updateRecord("contractors", id, name),
          removeRecord: (id) => settings.removeRecord("contractors", id),
        };
    }
  }, [activeSubMaster, settings]);

  const activeTabMeta = GENERAL_SETTINGS_SUB_TABS.find(
    (tab) => tab.id === activeSubMaster
  );

  const resetForm = () => {
    setForm(EMPTY_GENERAL_SETTINGS_FORM);
    setEditingId(null);
    setError(null);
  };

  const openEdit = (record: GeneralSettingsRecord) => {
    setEditingId(record.id);
    setForm({ name: record.name });
    setView("edit");
  };

  const handleSave = async () => {
    const editingName = editingId
      ? subMasterConfig.records.find((row) => row.id === editingId)?.name
      : undefined;
    const validationError = validateGeneralSettingsName(
      form.name,
      subMasterConfig.records.map((row) => row.name),
      editingName
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    if (view === "edit" && editingId) {
      await subMasterConfig.updateRecord(editingId, form.name);
    } else {
      await subMasterConfig.addRecord(form.name);
    }
    resetForm();
    setView("list");
  };

  const handleSubMasterChange = (subMaster: GeneralSettingsSubMaster) => {
    setActiveSubMaster(subMaster);
    resetForm();
    setSearchQuery("");
    setView("list");
  };

  if (!settings.isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading General Settings...
      </div>
    );
  }

  const tabBar = (
    <ModuleAddListTabBar
      moduleName={subMasterConfig.singularLabel}
      active={view === "add" ? "add" : "list"}
      onList={() => {
        resetForm();
        setView("list");
      }}
      onAdd={() => {
        resetForm();
        setView("add");
      }}
    />
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-corporate-brand/10 p-2 text-corporate-brand">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">General Settings</h2>
            <p className="text-sm text-corporate-muted">
            Central registry feeding dropdowns across Employee Master and the independent Overtime Tracker.
            </p>
          </div>
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="General settings sub-masters"
        >
          {GENERAL_SETTINGS_SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeSubMaster === tab.id}
              onClick={() => handleSubMasterChange(tab.id)}
              className={cn(
                "rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
                activeSubMaster === tab.id
                  ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                  : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTabMeta && (
          <p className="mt-3 text-sm text-corporate-muted">{activeTabMeta.description}</p>
        )}
      </div>

      {view === "add" || view === "edit" ? (
        <>
          {tabBar}
          <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
            <div>
              <h3 className="text-base font-semibold text-corporate-text">
                {view === "add"
                  ? `Add ${subMasterConfig.singularLabel}`
                  : `Edit ${subMasterConfig.singularLabel}`}
              </h3>
            </div>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <TextInput
              label={`${subMasterConfig.singularLabel} Name`}
              required
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              placeholder={`Enter ${subMasterConfig.singularLabel.toLowerCase()} name`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                className="rounded-full bg-corporate-brand px-5 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("list");
                }}
                className="rounded-full border border-corporate-border px-5 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {tabBar}
          <UniversalMasterListShell
            moduleName={subMasterConfig.singularLabel}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            title={`${activeTabMeta?.label ?? "Register"} List`}
            subtitle="Real-time search across all registered names."
          >
            <UniversalMasterListTable>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Name</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                <GeneralSettingsListBody
                  records={subMasterConfig.records}
                  singularLabel={subMasterConfig.singularLabel}
                  activeSubMaster={activeSubMaster}
                  onEdit={openEdit}
                  onRemove={subMasterConfig.removeRecord}
                />
              </tbody>
            </UniversalMasterListTable>
          </UniversalMasterListShell>
        </>
      )}
    </div>
  );
}

function GeneralSettingsListBody({
  records,
  singularLabel,
  activeSubMaster,
  onEdit,
  onRemove,
}: {
  records: GeneralSettingsRecord[];
  singularLabel: string;
  activeSubMaster: GeneralSettingsSubMaster;
  onEdit: (record: GeneralSettingsRecord) => void;
  onRemove: (id: string) => void;
}) {
  const { searchQuery, departmentFilter, designationFilter } = useMasterListFilters();
  const filtered = useMemo(
    () =>
      records.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.name, [row.id], {
          departmentFilter,
          designationFilter,
          skipDepartmentIfAbsent: true,
          skipDesignationIfAbsent: true,
        })
      ),
    [records, searchQuery, departmentFilter, designationFilter]
  );

  if (filtered.length === 0) {
    return (
      <tr>
        <td colSpan={2} className="px-4 py-10 text-center text-sm text-corporate-muted">
          <Wrench className="mx-auto mb-2 h-6 w-6 opacity-60" />
          {searchQuery.trim()
            ? LIST_SEARCH_EMPTY_MESSAGE
            : `No ${singularLabel.toLowerCase()} records yet.`}
        </td>
      </tr>
    );
  }

  return (
    <>
      {filtered.map((row) => (
        <UniversalMasterListRow key={row.id} onEdit={() => onEdit(row)}>
          <UniversalMasterListNameCell name={row.name} onEdit={() => onEdit(row)} />
          <td className={MASTER_LIST_BODY_CELL_CLASS}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="rounded-full border border-corporate-border px-3 py-1 text-xs font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Remove ${singularLabel.toLowerCase()} "${row.name}"?`)) {
                    return;
                  }
                  onRemove(row.id);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  activeSubMaster === "departments"
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-red-200 text-red-600"
                )}
              >
                Remove
              </button>
            </div>
          </td>
        </UniversalMasterListRow>
      ))}
    </>
  );
}
