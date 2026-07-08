"use client";

import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useAccountGroups } from "@/hooks/use-account-groups";
import { useBillOfSundries } from "@/hooks/use-bill-of-sundries";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import { cn } from "@/lib/utils";
import {
  EMPTY_BILL_OF_SUNDRIES_FORM,
  validateBillOfSundryForm,
  type BillOfSundryRecord,
  type SundryCalculationType,
  type SundryNatureType,
} from "@/types/bill-of-sundry";
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

function natureLabel(value: SundryNatureType) {
  return value === "plus" ? "Plus / Add" : "Minus / Subtract";
}

function calcLabel(value: SundryCalculationType) {
  return value === "percentage" ? "Percentage (%)" : "Absolute Value";
}

export default function BillOfSundriesManagementPanel() {
  const { sundries, isReady, addSundry, updateSundry, removeSundry } = useBillOfSundries();
  const { groups, isReady: groupsReady } = useAccountGroups();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_BILL_OF_SUNDRIES_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => sundries.find((row) => row.id === viewingId) ?? null,
    [sundries, viewingId]
  );

  const groupOptions = useMemo(
    () => groups.map((group) => ({ value: group.id, label: group.name })),
    [groups]
  );

  const resetForm = () => {
    setForm(EMPTY_BILL_OF_SUNDRIES_FORM);
    setEditingId(null);
    setError(null);
  };

  const openEdit = (record: BillOfSundryRecord) => {
    setEditingId(record.id);
    setForm({
      sundryName: record.sundryName,
      natureType: record.natureType,
      calculationType: record.calculationType,
      accountGroupId: record.accountGroupId,
      accountGroupName: record.accountGroupName,
    });
    setView("edit");
  };

  const handleSave = () => {
    const validationError = validateBillOfSundryForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (view === "edit" && editingId) {
      updateSundry(editingId, form);
    } else {
      addSundry(form);
    }
    resetForm();
    setView("list");
  };

  const handleRemove = (record: BillOfSundryRecord) => {
    if (record.isSystemSeed) {
      setError("System sundry entries cannot be removed.");
      return;
    }
    if (checkUsedInTransactions("bill-of-sundry", record.id, record.sundryName)) {
      setError("This sundry cannot be removed because it is used in transactions.");
      return;
    }
    if (!window.confirm(`Remove sundry "${record.sundryName}"?`)) return;
    removeSundry(record.id);
  };

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Sundry"
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

  if (!isReady || !groupsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading Bill of Sundries...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.sundryName}
          subtitle="Bill of Sundries · Charge Configuration"
          fields={[
            { label: "Nature", value: natureLabel(viewingRecord.natureType) },
            { label: "Calculation", value: calcLabel(viewingRecord.calculationType) },
            { label: "Account Group", value: viewingRecord.accountGroupName || "—" },
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
    return (
      <>
        {tabBar}
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Sundry" : "Edit Sundry"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Configure plus/minus charges linked to account groups for billing.
            </p>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Sundry Name"
              required
              value={form.sundryName}
              onChange={(e) => setForm((p) => ({ ...p, sundryName: e.target.value }))}
            />
            <SelectInput
              label="Calculation Type"
              value={form.calculationType}
              options={[
                { value: "percentage", label: "Percentage (%)" },
                { value: "absolute", label: "Absolute Value" },
              ]}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  calculationType: e.target.value as SundryCalculationType,
                }))
              }
            />
          </div>
          <div>
            <p className="form-label mb-2">Nature Type</p>
            <div className="inline-flex rounded-lg border border-corporate-border p-1">
              {(["plus", "minus"] as SundryNatureType[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, natureType: value }))}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    form.natureType === value
                      ? "bg-corporate-brand text-white"
                      : "text-corporate-text hover:bg-corporate-bg"
                  )}
                >
                  {natureLabel(value)}
                </button>
              ))}
            </div>
          </div>
          <SelectInput
            label="Account Head Link (Account Group)"
            required
            value={form.accountGroupId}
            placeholder="Select account group"
            options={groupOptions}
            onChange={(e) => {
              const group = groups.find((row) => row.id === e.target.value);
              setForm((p) => ({
                ...p,
                accountGroupId: e.target.value,
                accountGroupName: group?.name ?? "",
              }));
            }}
            hint="Links this sundry charge to the chart of accounts group hierarchy."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Sundry
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
        moduleName="Sundry"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Bill of Sundries List"
        subtitle="Pre-seeded GST, freight, discount, and round-off charges with custom additions."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Sundry Name</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Nature</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Calculation</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Group</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            <BillOfSundriesListBody
              sundries={sundries}
              onEdit={openEdit}
              onView={(row) => {
                setViewingId(row.id);
                setView("detail");
              }}
              onRemove={handleRemove}
              checkUsedInTransactions={checkUsedInTransactions}
            />
          </tbody>
        </UniversalMasterListTable>
      </UniversalMasterListShell>
    </>
  );
}

function BillOfSundriesListBody({
  sundries,
  onEdit,
  onView,
  onRemove,
  checkUsedInTransactions,
}: {
  sundries: BillOfSundryRecord[];
  onEdit: (record: BillOfSundryRecord) => void;
  onView: (record: BillOfSundryRecord) => void;
  onRemove: (record: BillOfSundryRecord) => void;
  checkUsedInTransactions: ReturnType<typeof useMasterDeletionGuard>["checkUsedInTransactions"];
}) {
  const { searchQuery, departmentFilter, designationFilter } = useMasterListFilters();
  const filtered = useMemo(
    () =>
      sundries.filter((row) =>
        matchesUniversalNameSearch(
          searchQuery,
          row.sundryName,
          [row.natureType, row.calculationType, row.accountGroupName],
          {
            departmentFilter,
            designationFilter,
            skipDepartmentIfAbsent: true,
            skipDesignationIfAbsent: true,
          }
        )
      ),
    [sundries, searchQuery, departmentFilter, designationFilter]
  );

  if (filtered.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
          <ScrollText className="mx-auto mb-2 h-6 w-6 opacity-60" />
          {searchQuery.trim() ? LIST_SEARCH_EMPTY_MESSAGE : "No sundries found."}
        </td>
      </tr>
    );
  }

  return (
    <>
      {filtered.map((row) => (
        <UniversalMasterListRow key={row.id} onEdit={() => onEdit(row)}>
          <UniversalMasterListNameCell
            name={row.sundryName}
            onEdit={() => onEdit(row)}
            suffix={
              row.isSystemSeed ? (
                <span className="ml-2 text-xs font-normal text-corporate-muted">(System)</span>
              ) : undefined
            }
          />
          <td className={MASTER_LIST_BODY_CELL_CLASS}>{natureLabel(row.natureType)}</td>
          <td className={MASTER_LIST_BODY_CELL_CLASS}>{calcLabel(row.calculationType)}</td>
          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.accountGroupName || "—"}</td>
          <UniversalMasterListActionsCell>
            <ModuleListActionGroup
              onView={() => onView(row)}
              onEdit={() => onEdit(row)}
              extra={
                <MasterRemoveOrProtected
                  canRemove={
                    !row.isSystemSeed &&
                    !checkUsedInTransactions("bill-of-sundry", row.id, row.sundryName)
                  }
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
