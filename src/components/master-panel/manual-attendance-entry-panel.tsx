"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Save } from "lucide-react";
import { FormGrid, SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import {
  buildAttendanceSyncPayload,
  EMPTY_MANUAL_ATTENDANCE_FORM,
  MANUAL_ATTENDANCE_STATUS_OPTIONS,
  type ManualAttendanceFormState,
} from "@/types/manual-attendance-entry";

export default function ManualAttendanceEntryPanel() {
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { ingestManualEntry } = useAttendanceWorkflow();
  const [form, setForm] = useState<ManualAttendanceFormState>(EMPTY_MANUAL_ATTENDANCE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: `${employee.name} · ${employee.employeeType}`,
      })),
    [employees]
  );

  const selectedEmployee = employees.find((row) => row.id === form.employeeId);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const { payload, error: validationError } = buildAttendanceSyncPayload(
      form,
      selectedEmployee?.name
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/attendance/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: payload.employee_id,
          employeeName: selectedEmployee?.name ?? "",
          attendanceDate: form.attendanceDate,
          status: payload.status,
          overtimeHours: payload.overtime_hours,
          remarks: payload.remarks,
          punchIn: payload.punch_in,
          punchOut: payload.punch_out,
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        record?: { id: string };
        sync?: typeof payload;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save attendance.");
      }

      if (result.record) {
        ingestManualEntry({
          id: result.record.id,
          employeeId: payload.employee_id,
          employeeName: selectedEmployee?.name ?? "",
          attendanceDate: form.attendanceDate,
          punchIn: payload.punch_in,
          punchOut: payload.punch_out ?? "",
          remarks: payload.remarks,
          status: payload.status,
          overtimeHours: payload.overtime_hours,
        });
      }

      setSuccess(result.message ?? "Attendance saved successfully.");
      setForm({
        ...EMPTY_MANUAL_ATTENDANCE_FORM,
        attendanceDate: form.attendanceDate,
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to save attendance.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-corporate-border pb-3">
        <CalendarCheck className="h-5 w-5 text-corporate-brand" aria-hidden />
        <div>
          <h3 className="text-base font-semibold text-corporate-text">
            Attendance Manual Entry
          </h3>
          <p className="text-sm text-corporate-muted">
            Supervisor self-entry form synced with the attendance workflow API payload.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <div className="form-section-card space-y-5">
        <FormGrid cols={2}>
          <SelectInput
            label="Select Staff / Employee"
            required
            value={form.employeeId}
            placeholder={employeesLoading ? "Loading staff..." : "Choose employee"}
            options={employeeOptions}
            onChange={(event) =>
              setForm((current) => ({ ...current, employeeId: event.target.value }))
            }
          />
          <TextInput
            label="Attendance Date (तारीख)"
            type="date"
            required
            value={form.attendanceDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, attendanceDate: event.target.value }))
            }
          />
        </FormGrid>

        <FormGrid cols={2}>
          <SelectInput
            label="Status"
            required
            value={form.status}
            placeholder="Select attendance status"
            options={MANUAL_ATTENDANCE_STATUS_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as ManualAttendanceFormState["status"],
              }))
            }
          />
          <TextInput
            label="Overtime Hours (ओवरटाइम घंटे)"
            type="number"
            min="0"
            step="0.5"
            value={form.overtimeHours}
            onChange={(event) =>
              setForm((current) => ({ ...current, overtimeHours: event.target.value }))
            }
          />
        </FormGrid>

        <TextareaInput
          label="Remarks / Shift Info"
          rows={3}
          value={form.remarks}
          placeholder="Shift, machine floor, or supervisor notes..."
          onChange={(event) =>
            setForm((current) => ({ ...current, remarks: event.target.value }))
          }
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || employeesLoading}
            className="btn-primary inline-flex h-12 min-h-[48px] items-center gap-2 px-6"
          >
            <Save className="h-4 w-4" aria-hidden />
            {isSaving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}
