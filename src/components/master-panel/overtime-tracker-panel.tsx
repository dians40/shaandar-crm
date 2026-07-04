"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Pencil, Plus } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { useEmployees } from "@/hooks/use-employees";
import { useOvertimeRecords } from "@/hooks/use-overtime";
import {
  calculateOvertimeHours,
  EMPTY_OVERTIME_FORM,
  type OvertimeRecord,
  type OvertimeShiftType,
} from "@/types/overtime";

type ViewMode = "list" | "add" | "edit";

export default function OvertimeTrackerPanel() {
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { records, isReady, addRecord, updateRecord } = useOvertimeRecords();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_OVERTIME_FORM);
  const [error, setError] = useState<string | null>(null);

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

  const resetForm = () => {
    setForm(EMPTY_OVERTIME_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
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
      approvedBy: record.approvedBy,
    });
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

  const handleSave = () => {
    if (!form.employeeId || !form.fromTime || !form.toTime || !form.approvedBy.trim()) {
      setError("Employee, time range, and Approved By are required.");
      return;
    }

    const payload = {
      ...form,
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

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading overtime records...
      </div>
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
            Capture shift, duration, machine, location, and approval details.
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
          <TextInput
            label="Assigned Machine"
            value={form.assignedMachine}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, assignedMachine: e.target.value }))
            }
          />
          <TextInput
            label="Approved By"
            required
            value={form.approvedBy}
            onChange={(e) => setForm((prev) => ({ ...prev, approvedBy: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <TextareaInput
              label="Work Location"
              hint='Where did they work if no machine was assigned? e.g., working in place of someone else'
              value={form.workLocation}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, workLocation: e.target.value }))
              }
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
            Track authorized extra hours and payout amounts.
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

      <div className="overflow-hidden rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
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
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Clock className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  No overtime records yet.
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm font-medium">{row.employeeName}</td>
                  <td className="px-4 py-3 text-sm">{row.shiftType}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.fromTime} – {row.toTime} ({row.totalHours}h)
                  </td>
                  <td className="px-4 py-3 text-sm">₹{row.amountToPay.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-sm">{row.approvedBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Overtime
                    </button>
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
