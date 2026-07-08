"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Save } from "lucide-react";
import { FormGrid, SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { cn } from "@/lib/utils";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import { dispatchAttendancePipelineRefresh } from "@/lib/attendance-pipeline-approval-ui";
import {
  buildAttendanceSyncPayload,
  EMPTY_MANUAL_ATTENDANCE_FORM,
  formatAttendanceStatusLabel,
  MANUAL_ATTENDANCE_STATUS_OPTIONS,
  type ManualAttendanceFormState,
} from "@/types/manual-attendance-entry";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

import {
  readManualAttendanceLog,
  writeManualAttendanceLog,
  type ManualAttendanceLogRow,
} from "@/lib/manual-attendance-log-store";

function formatRupee(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ManualAttendanceEntryPanel() {
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { ingestManualEntry, isReady } = useAttendanceWorkflow();
  const [form, setForm] = useState<ManualAttendanceFormState>(EMPTY_MANUAL_ATTENDANCE_FORM);
  const [wageLog, setWageLog] = useState<ManualAttendanceLogRow[]>([]);
  const [logReady, setLogReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setWageLog(readManualAttendanceLog());
    setLogReady(true);
  }, []);

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: `${employee.name} · ${employee.employeeType}`,
      })),
    [employees]
  );

  const selectedEmployee = employees.find((row) => row.id === form.employeeId);

  const displayLog = useMemo(
    () => [...wageLog].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)),
    [wageLog]
  );

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const dailyWage = Number(form.dailyWage) || 0;
    if (dailyWage < 0) {
      setError("Daily wage cannot be negative.");
      return;
    }

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
          remarks: payload.remarks,
          punchIn: payload.punch_in,
          punchOut: payload.punch_out,
          dailyWage,
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

      const recordId = result.record?.id ?? `att-manual-${Date.now()}`;

      ingestManualEntry({
        id: recordId,
        employeeId: payload.employee_id,
        employeeName: selectedEmployee?.name ?? "",
        attendanceDate: form.attendanceDate,
        punchIn: payload.punch_in,
        punchOut: payload.punch_out ?? "",
        remarks: payload.remarks,
        status: payload.status,
      });

      const nextLog: ManualAttendanceLogRow[] = [
        {
          id: recordId,
          employeeName: selectedEmployee?.name ?? "",
          attendanceDate: form.attendanceDate,
          status: payload.status,
          dailyWage,
          remarks: form.remarks.trim(),
        },
        ...wageLog.filter((row) => row.id !== recordId),
      ];
      setWageLog(nextLog);
      writeManualAttendanceLog(nextLog);

      dispatchAttendancePipelineRefresh();
      setSuccess(
        result.message ??
          "Manual attendance submitted to Layer 2 staging — approve in the Attendance Control Center pipeline."
      );
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
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-2 border-b border-corporate-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <h3 className="text-base font-semibold text-corporate-text">
              Manual Attendance &amp; Wage Entry
            </h3>
            <p className="text-sm text-corporate-muted">
              Log labor and staff attendance with daily wages — submissions enter Layer 2 approval immediately.
            </p>
          </div>
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
            label="Staff / Employee"
            required
            value={form.employeeId}
            placeholder={employeesLoading ? "Loading staff..." : "Select employee"}
            options={employeeOptions}
            onChange={(event) =>
              setForm((current) => ({ ...current, employeeId: event.target.value }))
            }
          />
          <TextInput
            label="Attendance Date"
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
            label="Attendance Status"
            required
            value={form.status}
            placeholder="Select status"
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
            label="Daily Wage (₹)"
            type="number"
            min="0"
            step="1"
            value={form.dailyWage}
            placeholder="0.00"
            onChange={(event) =>
              setForm((current) => ({ ...current, dailyWage: event.target.value }))
            }
          />
        </FormGrid>

        <TextareaInput
          label="Shift / Floor Remarks"
          rows={3}
          value={form.remarks}
          placeholder="Shift, machine floor, contractor batch, or supervisor notes..."
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
            {isSaving ? "Saving..." : "Save Attendance & Wage"}
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <header className="border-b border-corporate-border px-4 py-3">
          <h4 className="text-sm font-bold text-corporate-text">Today&apos;s Manual Entry Log</h4>
          <p className="text-xs text-corporate-muted">
            Recent labor and staff attendance entries with wage amounts
          </p>
        </header>
        <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "rounded-none border-0 shadow-none")}>
          <table className={MASTER_LIST_TABLE_CLASS}>
            <thead className={MASTER_LIST_HEAD_CLASS}>
              <tr>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Daily Wage</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {!isReady || !logReady ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-corporate-muted">
                    Loading attendance log...
                  </td>
                </tr>
              ) : displayLog.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-corporate-muted">
                    No manual attendance entries yet. Use the form above to log staff attendance.
                  </td>
                </tr>
              ) : (
                displayLog.map((row) => (
                  <tr key={row.id} className="hover:bg-corporate-bg/50">
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "whitespace-nowrap text-xs")}>
                      {row.attendanceDate}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                      {row.employeeName}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      <span className="rounded-full border border-corporate-border bg-corporate-bg px-2.5 py-1 text-xs font-semibold">
                        {formatAttendanceStatusLabel(row.status)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        MASTER_LIST_BODY_CELL_CLASS,
                        "text-right font-semibold text-corporate-brand"
                      )}
                    >
                      {row.dailyWage > 0 ? formatRupee(row.dailyWage) : "—"}
                    </td>
                    <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "max-w-[220px] truncate")}>
                      {row.remarks || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
