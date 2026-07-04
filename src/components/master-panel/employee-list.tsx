"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { deleteEmployee, patchEmployeeSalary } from "@/lib/employees-api";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import { selectMasterPanelEntity } from "@/lib/master-panel-entity-bridge";
import { formatSalaryDisplay } from "@/lib/map-employee-to-db";
import type { EmployeeListItem } from "@/types/employee-list";
import { SupabaseConnectedBadge } from "./supabase-setup-banner";
import ModuleListActionGroup from "./module-list-action-group";
import ModuleListRecordLink from "./module-list-record-link";
import ModuleListSearchBar from "./module-list-search-bar";

type Props = {
  employees: EmployeeListItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAddNew: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onRefresh: () => void;
  /** Hide duplicate Add button when parent provides sub-tabs */
  hideHeaderAddButton?: boolean;
};

export default function EmployeeList({
  employees = [],
  isLoading = false,
  error = null,
  onRetry,
  onAddNew,
  onView,
  onEdit,
  onRefresh,
  hideHeaderAddButton = false,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [salaryDrafts, setSalaryDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { checkUsedInTransactions } = useMasterDeletionGuard();

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        matchesUniversalNameSearch(searchQuery, employee.name, [
          employee.firstName,
          employee.lastName,
          employee.mobileNumber,
          employee.employeeType,
          employee.vehicleNumber,
          employee.machineAssignment,
        ])
      ),
    [employees, searchQuery]
  );

  const handleSalarySave = async (employee: EmployeeListItem) => {
    const draft = salaryDrafts[employee.id];
    if (draft === undefined) return;

    setSavingId(employee.id);
    setActionError(null);

    try {
      await patchEmployeeSalary(employee.id, {
        fixSalaryAmount: draft === "" ? null : Number(draft),
        variableSalaryEnabled: employee.variableSalaryEnabled,
        dailyRate: employee.dailyRate,
        workedDays: employee.workedDays,
      });
      setSalaryDrafts((prev) => {
        const next = { ...prev };
        delete next[employee.id];
        return next;
      });
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update salary.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (employee: EmployeeListItem) => {
    if (
      employee.hasAttendanceRecords ||
      checkUsedInTransactions("employee", employee.id, employee.name)
    ) {
      setActionError(
        "This employee cannot be deleted because attendance or transaction records exist."
      );
      return;
    }

    if (
      !window.confirm(`Remove employee "${employee.name}"? This cannot be undone.`)
    ) {
      return;
    }

    setDeletingId(employee.id);
    setActionError(null);

    try {
      await deleteEmployee(employee.id);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete employee.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
            Employee
          </p>
          <h2 className="mt-1 text-lg font-semibold text-corporate-text">
            Employee List
          </h2>
          <p className="mt-1 text-sm text-corporate-muted">
            Saved labor records — search, view bio-data, edit, or add new.
          </p>
          <div className="mt-2">
            <SupabaseConnectedBadge />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {!hideHeaderAddButton && (
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white hover:bg-corporate-brand/90"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
        <ModuleListSearchBar
          moduleName="Employee"
          value={searchQuery}
          onChange={setSearchQuery}
        />

      {(error || actionError) && (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p>{error || actionError}</p>
            {error && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-corporate-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-corporate-border">
            <thead className="bg-corporate-bg">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  Employee Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  Mobile
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  Vehicle No.
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  Machine
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  Salary (Editable)
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-corporate-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-corporate-brand" />
                    <p className="mt-3 text-sm text-corporate-muted">Loading employees...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 && !error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Users className="mx-auto h-8 w-8 text-corporate-muted/60" />
                    <p className="mt-3 text-sm font-medium text-corporate-text">
                      {searchQuery.trim()
                        ? LIST_SEARCH_EMPTY_MESSAGE
                        : "No employees found"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const draftValue =
                    salaryDrafts[employee.id] ??
                    (employee.fixSalaryAmount !== null
                      ? String(employee.fixSalaryAmount)
                      : "");

                  return (
                    <tr
                      key={employee.id}
                      className="cursor-pointer hover:bg-corporate-bg/60"
                      onClick={() => onView(employee.id)}
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        <ModuleListRecordLink
                          label={employee.name}
                          onOpen={() => onView(employee.id)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex rounded-full bg-corporate-brand-light px-2.5 py-1 text-xs font-medium text-corporate-brand">
                          {employee.employeeType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-corporate-text">
                        {employee.mobileNumber}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-corporate-muted">
                        {employee.vehicleNumber}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-corporate-muted">
                        {employee.machineAssignment}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[160px] flex-col gap-1">
                          {employee.variableSalaryEnabled ? (
                            <span className="text-xs text-corporate-brand">
                              {formatSalaryDisplay(employee)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draftValue}
                              onChange={(e) =>
                                setSalaryDrafts((prev) => ({
                                  ...prev,
                                  [employee.id]: e.target.value,
                                }))
                              }
                              className="input-field py-1.5 text-sm"
                              placeholder="Enter salary"
                            />
                          )}
                          {!employee.variableSalaryEnabled &&
                            salaryDrafts[employee.id] !== undefined && (
                              <button
                                type="button"
                                disabled={savingId === employee.id}
                                onClick={() => void handleSalarySave(employee)}
                                className="text-left text-xs font-medium text-corporate-brand hover:underline"
                              >
                                {savingId === employee.id ? "Saving..." : "Save salary"}
                              </button>
                            )}
                        </div>
                      </td>
                      <td
                        className="whitespace-nowrap px-5 py-4 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ModuleListActionGroup
                          onView={() => onView(employee.id)}
                          onSelect={() =>
                            selectMasterPanelEntity({
                              entityType: "employee",
                              entityId: employee.id,
                              entityName: employee.name,
                              sourceModuleId: "employee-management",
                              targetModuleId: "overtime-tracker",
                            })
                          }
                          onEdit={() => onEdit(employee.id)}
                          editLabel="Edit"
                          extra={
                            !employee.hasAttendanceRecords &&
                            !checkUsedInTransactions(
                              "employee",
                              employee.id,
                              employee.name
                            ) ? (
                              <button
                                type="button"
                                disabled={deletingId === employee.id}
                                onClick={() => void handleDelete(employee)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingId === employee.id ? "..." : "Remove"}
                              </button>
                            ) : (
                              <span
                                className="inline-flex items-center rounded-lg border border-corporate-border px-2.5 py-1.5 text-xs text-corporate-muted"
                                title="Cannot delete — attendance or transaction records exist"
                              >
                                Protected
                              </span>
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && !error && (
        <p className="text-xs text-corporate-muted">
          Showing {filteredEmployees.length} of {employees.length} employee
          {employees.length === 1 ? "" : "s"}
          {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}
        </p>
      )}
      </div>
    </div>
  );
}
