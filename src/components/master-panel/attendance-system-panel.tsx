"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { mergeDepartmentOptions } from "@/lib/attendance-department-options";
import { mergeDesignationOptions } from "@/lib/attendance-designation-options";
import { cn } from "@/lib/utils";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { LIST_SEARCH_EMPTY_MESSAGE } from "@/lib/list-search-filter";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import LayerFilterControls from "./layer-filter-controls";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type AttendanceSystemPanelProps = {
  refreshToken?: number;
  onCommitted?: () => void;
};

export default function AttendanceSystemPanel({
  refreshToken = 0,
  onCommitted,
}: AttendanceSystemPanelProps) {
  const [rows, setRows] = useState<BiometricAttendanceGridRow[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resetPanelState = useCallback(() => {
    setFromDate("");
    setToDate("");
    setSearchQuery("");
    setMessage(null);
    setError(null);
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        stage: "LAYER_3_WORKFLOW",
        format: "grid",
      });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const response = await fetch(`/api/v1/attendance/pipeline?${params.toString()}`);
      const body = (await response.json()) as {
        rows?: BiometricAttendanceGridRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Failed to load workflow records.");
      setRows(body.rows ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, refreshToken]);

  const departmentOptions = useMemo(
    () => mergeDepartmentOptions(rows.map((row) => row.department)),
    [rows]
  );

  const designationOptions = useMemo(
    () => mergeDesignationOptions(rows.map((row) => row.designation)),
    [rows]
  );

  const postPipelineAction = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/v1/attendance/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(body.error ?? "Pipeline action failed."));
    return body;
  };

  const handleFieldChange = async (
    row: BiometricAttendanceGridRow,
    field: "department" | "designation",
    value: string
  ) => {
    if (!value || value === row[field]) return;
    setBusyId(row.id);
    setError(null);
    try {
      await postPipelineAction({
        action: "update-row-fields",
        ids: [row.id],
        stage: "LAYER_3_WORKFLOW",
        [field]: value,
      });
      setRows((current) =>
        current.map((entry) => (entry.id === row.id ? { ...entry, [field]: value } : entry))
      );
      setMessage(`${field === "department" ? "Department" : "Designation"} updated for ${row.employeeName || row.payCode}.`);
    } catch (fieldError) {
      setError(fieldError instanceof Error ? fieldError.message : "Field update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (row: BiometricAttendanceGridRow) => {
    setBusyId(row.id);
    setMessage(null);
    try {
      await postPipelineAction({ action: "commit-workflow", ids: [row.id] });
      setMessage(`Approved ${row.employeeName} — moved to Layer 4 saved history.`);
      await loadRecords();
      onCommitted?.();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveAll = async () => {
    if (rows.length === 0) return;
    setMessage(null);
    try {
      const ids = rows.map((row) => row.id);
      const body = await postPipelineAction({ action: "commit-all-workflow", ids });
      setMessage(`Moved ${body.transitioned ?? ids.length} row(s) to Layer 4 saved history.`);
      await loadRecords();
      onCommitted?.();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Bulk approval failed.");
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-corporate-muted">
          Layer 3 only — records with pipeline_stage LAYER_3_WORKFLOW. Edit Department and
          Designation inline before final approval to Layer 4.
        </p>
        <button
          type="button"
          onClick={() => void handleApproveAll()}
          disabled={rows.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Approve All to Layer 4 ({rows.length})
        </button>
      </div>

      <LayerFilterControls
        idPrefix="layer-3-workflow"
        fromDate={fromDate}
        toDate={toDate}
        searchQuery={searchQuery}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearchChange={setSearchQuery}
        onRefresh={() => void loadRecords()}
        isRefreshing={loading}
        summary={`${rows.length} workflow record(s) at LAYER_3_WORKFLOW`}
        searchPlaceholder="Search employee, date, pay code..."
      />

      {message && (
        <p className="flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "max-h-[480px] overflow-auto")}>
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[1100px]")}>
          <thead className={cn(MASTER_LIST_HEAD_CLASS, "sticky top-0 z-10")}>
            <tr>
              {[
                "Actions",
                "Employee",
                "Date",
                "Department",
                "Designation",
                "Punch In",
                "Punch Out",
                "Pay Code",
              ].map((label) => (
                <th key={label} className={MASTER_LIST_HEADER_CELL_CLASS}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-corporate-muted">
                  <CalendarCheck className="mx-auto mb-2 h-6 w-6 opacity-60" aria-hidden />
                  {searchQuery.trim()
                    ? LIST_SEARCH_EMPTY_MESSAGE
                    : "No Layer 3 records — approve uploads in Layer 2 first."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void handleApprove(row)}
                      className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busyId === row.id ? "Saving..." : "Approve"}
                    </button>
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                    {row.employeeName}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.date}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <select
                      value={row.department || ""}
                      disabled={busyId === row.id}
                      onChange={(event) =>
                        void handleFieldChange(row, "department", event.target.value)
                      }
                      className="min-w-[130px] rounded border border-corporate-border bg-white px-2 py-1 text-xs"
                    >
                      <option value="">Select department</option>
                      {departmentOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <select
                      value={row.designation || ""}
                      disabled={busyId === row.id}
                      onChange={(event) =>
                        void handleFieldChange(row, "designation", event.target.value)
                      }
                      className="min-w-[130px] rounded border border-corporate-border bg-white px-2 py-1 text-xs"
                    >
                      <option value="">Select designation</option>
                      {designationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.inTime || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.outTime || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.payCode || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
