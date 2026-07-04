"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import {
  OVERTIME_LOCATION_PRESETS,
  OVERTIME_MACHINE_PRESETS,
  OVERTIME_SUPERVISOR_PRESETS,
} from "@/constants/overtime-options";
import { useEmployees } from "@/hooks/use-employees";
import { useGodowns } from "@/hooks/use-godowns";
import { useOvertimeRecords } from "@/hooks/use-overtime";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import {
  MASTER_PANEL_ENTITY_SELECTED_EVENT,
  readMasterPanelSelection,
  selectMasterPanelEntity,
} from "@/lib/master-panel-entity-bridge";
import {
  calculateOvertimeHours,
  EMPTY_OVERTIME_FORM,
  type OvertimeRecord,
  type OvertimeShiftType,
} from "@/types/overtime";
import ModuleListActionGroup from "./module-list-action-group";
import ModuleListSearchBar from "./module-list-search-bar";
import UniversalRecordProfile from "./universal-record-profile";

const MACHINE_CUSTOM_VALUE = "__custom_machine__";

type ViewMode = "list" | "add" | "edit" | "detail";

export default function OvertimeTrackerPanel() {
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { godowns, isReady: godownsReady } = useGodowns();
  const { records, isReady, addRecord, updateRecord } = useOvertimeRecords();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_OVERTIME_FORM);
  const [machineSelect, setMachineSelect] = useState("");
  const [customMachine, setCustomMachine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => records.find((row) => row.id === viewingId) ?? null,
    [records, viewingId]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.employeeName, [
          row.shiftType,
          row.fromTime,
          row.toTime,
          row.workLocation,
          row.workLocationAssignment,
          row.assignedManager,
          row.assignedMachine,
          row.approvedBy,
          row.narration,
          String(row.amountToPay),
          String(row.totalHours),
        ])
      ),
    [records, searchQuery]
  );

  const applySelectedEmployee = (employeeId: string, employeeName: string) => {
    setForm((prev) => ({
      ...prev,
      employeeId,
      employeeName,
    }));
  };

  const consumePendingEmployeeSelection = () => {
    const selection = readMasterPanelSelection();
    if (selection?.entityType === "employee" && selection.entityId) {
      applySelectedEmployee(selection.entityId, selection.entityName);
    }
  };

  const totalHours = useMemo(
    () => calculateOvertimeHours(form.fromTime, form.toTime),
    [form.fromTime, form.toTime]
  );

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: employee.name,
      })),
    [employees]
  );

  const machineOptions = useMemo(() => {
    const fromEmployees = employees
      .map((employee) => employee.machineAssignment?.trim())
      .filter((value): value is string => Boolean(value && value !== "—"));
    const unique = Array.from(new Set(fromEmployees));
    return [
      ...OVERTIME_MACHINE_PRESETS.map((label) => ({ value: label, label })),
      ...unique.map((label) => ({ value: label, label })),
      { value: MACHINE_CUSTOM_VALUE, label: "Other / type manually" },
    ];
  }, [employees]);

  const managerOptions = useMemo(() => {
    const fromEmployees = employees.map((employee) => employee.name);
    const fromGodowns = godowns
      .map((godown) => godown.managerName?.trim())
      .filter((value): value is string => Boolean(value));
    const unique = Array.from(
      new Set([...OVERTIME_SUPERVISOR_PRESETS, ...fromEmployees, ...fromGodowns])
    );
    return unique.map((label) => ({ value: label, label }));
  }, [employees, godowns]);

  const supervisorOptions = useMemo(() => {
    const fromEmployees = employees.map((employee) => employee.name);
    const fromGodowns = godowns
      .map((godown) => godown.managerName?.trim())
      .filter((value): value is string => Boolean(value));
    const unique = Array.from(
      new Set([...OVERTIME_SUPERVISOR_PRESETS, ...fromEmployees, ...fromGodowns])
    );
    return unique.map((label) => ({ value: label, label }));
  }, [employees, godowns]);

  const workLocationOptions = useMemo(() => {
    const godownLocations = godowns.map(
      (godown) => `Godown: ${godown.name}${godown.code ? ` (${godown.code})` : ""}`
    );
    const substitutionOptions = employees.map(
      (employee) => `Substituting for: ${employee.name}`
    );
    const unique = Array.from(
      new Set([
        ...OVERTIME_LOCATION_PRESETS,
        ...godownLocations,
        ...substitutionOptions,
      ])
    );
    return unique.map((label) => ({ value: label, label }));
  }, [employees, godowns]);

  const syncMachineFields = (assignedMachine: string) => {
    const knownValues = machineOptions.map((option) => option.value);
    if (!assignedMachine) {
      setMachineSelect("");
      setCustomMachine("");
      return;
    }
    if (knownValues.includes(assignedMachine)) {
      setMachineSelect(assignedMachine);
      setCustomMachine("");
      return;
    }
    setMachineSelect(MACHINE_CUSTOM_VALUE);
    setCustomMachine(assignedMachine);
  };

  const resetForm = () => {
    setForm(EMPTY_OVERTIME_FORM);
    setMachineSelect("");
    setCustomMachine("");
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    consumePendingEmployeeSelection();
    setView("add");
  };

  const openView = (record: OvertimeRecord) => {
    setViewingId(record.id);
    setView("detail");
  };

  const openEdit = (record: OvertimeRecord) => {
    setEditingId(record.id);
    setForm({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      shiftType: record.shiftType,
      fromTime: record.fromTime,
      toTime: record.toTime,
      amountToPay: record.amountToPay,
      assignedMachine: record.assignedMachine,
      workLocation: record.workLocation,
      assignedManager: record.assignedManager,
      workLocationAssignment: record.workLocationAssignment,
      approvedBy: record.approvedBy,
      narration: record.narration,
    });
    syncMachineFields(record.assignedMachine);
    setView("edit");
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((row) => row.id === employeeId);
    setForm((prev) => ({
      ...prev,
      employeeId,
      employeeName: employee?.name ?? "",
    }));
  };

  const handleMachineSelectChange = (value: string) => {
    setMachineSelect(value);
    if (value === MACHINE_CUSTOM_VALUE) {
      setForm((prev) => ({ ...prev, assignedMachine: customMachine }));
      return;
    }
    setCustomMachine("");
    setForm((prev) => ({ ...prev, assignedMachine: value }));
  };

  const handleSave = () => {
    const resolvedMachine =
      machineSelect === MACHINE_CUSTOM_VALUE
        ? customMachine.trim()
        : form.assignedMachine.trim();

    if (
      !form.employeeId ||
      !form.fromTime ||
      !form.toTime ||
      !form.approvedBy.trim() ||
      !form.workLocationAssignment.trim() ||
      !form.assignedManager.trim()
    ) {
      setError(
        "Employee, time range, work location assignment, assigned manager, and Approved By are required."
      );
      return;
    }

    const payload = {
      ...form,
      assignedMachine: resolvedMachine,
      workLocation: form.workLocationAssignment,
      amountToPay: Number(form.amountToPay) || 0,
    };

    if (view === "edit" && editingId) {
      updateRecord(editingId, payload);
    } else {
      addRecord(payload);
    }

    resetForm();
    setView("list");
  };

  useEffect(() => {
    if (view === "add" && !form.amountToPay && totalHours > 0) {
      setForm((prev) => ({ ...prev, amountToPay: totalHours * 100 }));
    }
  }, [totalHours, view, form.amountToPay]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ entityType?: string; entityId?: string; entityName?: string }>).detail;
      if (detail?.entityType === "employee" && detail.entityId) {
        resetForm();
        applySelectedEmployee(detail.entityId, detail.entityName ?? "");
        setView("add");
      }
    };

    window.addEventListener(MASTER_PANEL_ENTITY_SELECTED_EVENT, handler);
    return () => window.removeEventListener(MASTER_PANEL_ENTITY_SELECTED_EVENT, handler);
  }, []);

  if (!isReady || !godownsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading overtime records...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <UniversalRecordProfile
        title={viewingRecord.employeeName}
        subtitle={`${viewingRecord.shiftType} · Overtime Record`}
        fields={[
          { label: "Shift Type", value: viewingRecord.shiftType },
          { label: "From Time", value: viewingRecord.fromTime },
          { label: "To Time", value: viewingRecord.toTime },
          { label: "Total Hours", value: viewingRecord.totalHours },
          {
            label: "Amount to Pay",
            value: `₹${viewingRecord.amountToPay.toLocaleString("en-IN")}`,
          },
          { label: "Assigned Machine", value: viewingRecord.assignedMachine },
          { label: "Work Location", value: viewingRecord.workLocation },
          { label: "Work Assignment", value: viewingRecord.workLocationAssignment },
          { label: "Assigned Manager", value: viewingRecord.assignedManager },
          { label: "Approved By", value: viewingRecord.approvedBy },
          { label: "Narration", value: viewingRecord.narration },
        ]}
        onBack={() => {
          setViewingId(null);
          setView("list");
        }}
        onEdit={() => openEdit(viewingRecord)}
      />
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">
            {view === "add" ? "Add Overtime" : "Edit Overtime"}
          </h2>
          <p className="text-sm text-corporate-muted">
            Capture shift, duration, machine, manager assignment, and approval details.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Employee Name"
            required
            disabled={employeesLoading}
            value={form.employeeId}
            placeholder="Select employee"
            onChange={(e) => handleEmployeeChange(e.target.value)}
            options={employeeOptions}
          />
          <SelectInput
            label="Shift Type / Operation"
            required
            value={form.shiftType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                shiftType: e.target.value as OvertimeShiftType,
              }))
            }
            options={[
              { value: "Half Shift", label: "Half Shift" },
              { value: "Full Shift", label: "Full Shift" },
            ]}
          />
          <TextInput
            label="From Time (HH:MM)"
            required
            placeholder="18:00"
            value={form.fromTime}
            onChange={(e) => setForm((prev) => ({ ...prev, fromTime: e.target.value }))}
          />
          <TextInput
            label="To Time (HH:MM)"
            required
            placeholder="22:00"
            value={form.toTime}
            onChange={(e) => setForm((prev) => ({ ...prev, toTime: e.target.value }))}
          />
          <TextInput
            label="Total Hours"
            readOnly
            value={String(totalHours)}
            className="bg-corporate-bg"
            hint="Auto-calculated from From/To time"
          />
          <TextInput
            label="Amount to Pay"
            type="number"
            min="0"
            step="0.01"
            value={String(form.amountToPay)}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, amountToPay: Number(e.target.value) }))
            }
          />
          <SelectInput
            label="Assigned Machine"
            value={machineSelect}
            placeholder="Select machine"
            onChange={(e) => handleMachineSelectChange(e.target.value)}
            options={machineOptions}
          />
          {machineSelect === MACHINE_CUSTOM_VALUE && (
            <TextInput
              label="Machine name (manual entry)"
              value={customMachine}
              onChange={(e) => {
                const value = e.target.value;
                setCustomMachine(value);
                setForm((prev) => ({ ...prev, assignedMachine: value }));
              }}
            />
          )}
          <SelectInput
            label="Work Location & Assignment"
            required
            value={form.workLocationAssignment}
            placeholder="Select work location or substitution"
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                workLocationAssignment: e.target.value,
              }))
            }
            options={workLocationOptions}
            hint="Assign godown, floor duty, or who the labor is substituting for"
          />
          <SelectInput
            label="Assigned Manager / Supervisor"
            required
            value={form.assignedManager}
            placeholder="Select manager or supervisor"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, assignedManager: e.target.value }))
            }
            options={managerOptions}
            hint="Who oversees this overtime assignment"
          />
          <SelectInput
            label="Approved By"
            required
            value={form.approvedBy}
            placeholder="Select authorizing supervisor"
            onChange={(e) => setForm((prev) => ({ ...prev, approvedBy: e.target.value }))}
            options={supervisorOptions}
          />
          <div className="sm:col-span-2">
            <TextareaInput
              label="Narration"
              hint="Optional remarks, edge cases, or unexpected events during this overtime"
              value={form.narration}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, narration: e.target.value }))
              }
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
          >
            Save Overtime
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
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">Overtime List</h2>
          <p className="text-sm text-corporate-muted">
            Track authorized extra hours, manager assignments, and payout amounts.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Add Overtime
        </button>
      </div>

      <ModuleListSearchBar
        moduleName="Overtime"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <table className="min-w-full divide-y divide-corporate-border">
          <thead className="bg-corporate-bg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Employee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Shift
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Location / Manager
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Approved By
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Clock className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  No overtime records yet.
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  {LIST_SEARCH_EMPTY_MESSAGE}
                </td>
              </tr>
            ) : (
              filteredRecords.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm font-medium">{row.employeeName}</td>
                  <td className="px-4 py-3 text-sm">{row.shiftType}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.fromTime} – {row.toTime} ({row.totalHours}h)
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p>{row.workLocationAssignment || row.workLocation || "—"}</p>
                    {row.assignedManager && (
                      <p className="text-xs text-corporate-muted">
                        Manager: {row.assignedManager}
                      </p>
                    )}
                    {row.narration && (
                      <p className="mt-1 text-xs italic text-corporate-muted">
                        {row.narration}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">₹{row.amountToPay.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-sm">{row.approvedBy}</td>
                  <td className="px-4 py-3 text-right">
                    <ModuleListActionGroup
                      onView={() => openView(row)}
                      onSelect={() =>
                        selectMasterPanelEntity({
                          entityType: "employee",
                          entityId: row.employeeId,
                          entityName: row.employeeName,
                          sourceModuleId: "overtime-tracker",
                          targetModuleId: "overtime-tracker",
                        })
                      }
                      selectLabel="Use Employee"
                      onEdit={() => openEdit(row)}
                      editLabel="Edit Overtime"
                      showSelect={Boolean(row.employeeId)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
