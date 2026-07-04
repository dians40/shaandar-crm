"use client";

import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useSalaryComponents } from "@/hooks/use-salary-components";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  EMPTY_SALARY_COMPONENT_FORM,
  validateSalaryComponentForm,
  type SalaryComponentRecord,
  type SalaryComponentType,
} from "@/types/salary-component";
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

function typeLabel(value: SalaryComponentType) {
  return value === "earning" ? "Earnings" : "Deductions";
}

export default function SalaryComponentManagementPanel() {
  const { components, payrollSummary, isReady, addComponent, updateComponent, removeComponent } =
    useSalaryComponents();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_SALARY_COMPONENT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => components.find((row) => row.id === viewingId) ?? null,
    [components, viewingId]
  );

  const filtered = useMemo(
    () =>
      components.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.componentName, [row.componentType])
      ),
    [components, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_SALARY_COMPONENT_FORM);
    setEditingId(null);
    setError(null);
  };

  const openEdit = (record: SalaryComponentRecord) => {
    setEditingId(record.id);
    setForm({
      componentName: record.componentName,
      componentType: record.componentType,
    });
    setView("edit");
  };

  const handleSave = () => {
    const validationError = validateSalaryComponentForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (view === "edit" && editingId) {
      updateComponent(editingId, form);
    } else {
      addComponent(form);
    }
    resetForm();
    setView("list");
  };

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Salary Component"
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
        Loading Salary Components...
      </div>
    );
  }

  const payrollBanner = (
    <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light/30 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
        Universal Payroll Architecture
      </p>
      <p className="mt-2 text-sm text-corporate-text">
        <span className="font-medium">{payrollSummary.earningsCount} Earnings</span>
        {" · "}
        <span className="font-medium">{payrollSummary.deductionsCount} Deductions</span>
      </p>
      <p className="mt-1 text-sm font-semibold text-corporate-brand">
        Net Pay = Total Earnings − Total Deductions
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Earnings</p>
          <ul className="mt-1 space-y-0.5 text-xs text-corporate-muted">
            {payrollSummary.earnings.map((row) => (
              <li key={row.id}>{row.componentName}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-700">Deductions</p>
          <ul className="mt-1 space-y-0.5 text-xs text-corporate-muted">
            {payrollSummary.deductions.map((row) => (
              <li key={row.id}>{row.componentName}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.componentName}
          subtitle="Salary Component · Payroll Structure"
          fields={[
            { label: "Type", value: typeLabel(viewingRecord.componentType) },
            { label: "System Standard", value: viewingRecord.isSystemSeed },
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
              {view === "add" ? "Add Salary Component" : "Edit Salary Component"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Extend the universal payroll structure with custom earnings or deductions.
            </p>
          </div>
          {payrollBanner}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Component Name"
              required
              value={form.componentName}
              onChange={(e) => setForm((p) => ({ ...p, componentName: e.target.value }))}
            />
            <SelectInput
              label="Type"
              value={form.componentType}
              options={[
                { value: "earning", label: "Earnings" },
                { value: "deduction", label: "Deductions" },
              ]}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  componentType: e.target.value as SalaryComponentType,
                }))
              }
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Component
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
        moduleName="Salary Component"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Salary Component List"
        subtitle="Standard payroll rules — Basic, DA, HRA, PF, ESI, and custom heads."
      >
        {payrollBanner}
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Component</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Type</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Wallet className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  {searchQuery.trim() ? LIST_SEARCH_EMPTY_MESSAGE : "No components found."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={row.componentName}
                    onEdit={() => openEdit(row)}
                    suffix={
                      row.isSystemSeed ? (
                        <span className="ml-2 text-xs font-normal text-corporate-muted">
                          (Standard)
                        </span>
                      ) : undefined
                    }
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {typeLabel(row.componentType)}
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
                            !row.isSystemSeed &&
                            !checkUsedInTransactions(
                              "salary-component",
                              row.id,
                              row.componentName
                            )
                          }
                          onRemove={() => {
                            if (row.isSystemSeed) return;
                            if (!window.confirm(`Remove "${row.componentName}"?`)) return;
                            removeComponent(row.id);
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
