"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { mergeDepartmentOptions } from "@/lib/attendance-department-options";
import { dispatchDepartmentMasterRefresh } from "@/lib/department-master-client";
import { mergeDesignationOptions } from "@/lib/attendance-designation-options";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import {
  MANUAL_ATTENDANCE_LOG_UPDATED_EVENT,
  mergeManualEntryNamesIntoOptions,
} from "@/lib/manual-attendance-log-store";
import {
  ATTENDANCE_PIPELINE_REFRESH_EVENT,
  LAYER_3_APPROVAL_OPTIONS,
  type PipelineApprovalAction,
} from "@/lib/attendance-pipeline-approval-ui";
import { cn } from "@/lib/utils";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { LIST_SEARCH_EMPTY_MESSAGE } from "@/lib/list-search-filter";
import type { BiometricAttendanceGridRow } from "@/types/biometric-attendance-grid";
import { PIPELINE_STAGES } from "@/types/attendance-pipeline";
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
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvalSelections, setApprovalSelections] = useState<Record<string, PipelineApprovalAction>>({});
  const [manualLogRefresh, setManualLogRefresh] = useState(0);
  const { departmentNames } = useGeneralSettings();

  const resetPanelState = useCallback(() => {
    setFromDate("");
    setToDate("");
    setSearchQuery("");
    setDepartmentFilter("");
    setDesignationFilter("");
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
      if (departmentFilter) params.set("department", departmentFilter);
      if (designationFilter) params.set("designation", designationFilter);
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
  }, [fromDate, toDate, searchQuery, departmentFilter, designationFilter]);

  const filterDepartmentOptions = useMemo(
    () => mergeDepartmentOptions([], departmentNames),
    [departmentNames]
  );

  const filterDesignationOptions = useMemo(() => mergeDesignationOptions([]), []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, refreshToken]);

  useEffect(() => {
    const handler = () => setManualLogRefresh((current) => current + 1);
    const refreshPipeline = () => void loadRecords();
    window.addEventListener(MANUAL_ATTENDANCE_LOG_UPDATED_EVENT, handler);
    window.addEventListener(ATTENDANCE_PIPELINE_REFRESH_EVENT, refreshPipeline);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(MANUAL_ATTENDANCE_LOG_UPDATED_EVENT, handler);
      window.removeEventListener(ATTENDANCE_PIPELINE_REFRESH_EVENT, refreshPipeline);
      window.removeEventListener("storage", handler);
    };
  }, [loadRecords]);

  const departmentOptions = useMemo(() => {
    void manualLogRefresh;
    return mergeManualEntryNamesIntoOptions(
      mergeDepartmentOptions(rows.map((row) => row.department), departmentNames)
    );
  }, [rows, manualLogRefresh, departmentNames]);

  const designationOptions = useMemo(() => {
    void manualLogRefresh;
    return mergeManualEntryNamesIntoOptions(
      mergeDesignationOptions(rows.map((row) => row.designation))
    );
  }, [rows, manualLogRefresh]);

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
      if (field === "department") {
        dispatchDepartmentMasterRefresh();
      }
    } catch (fieldError) {
      setError(fieldError instanceof Error ? fieldError.message : "Field update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleLayer3Approval = async (row: BiometricAttendanceGridRow, action: PipelineApprovalAction) => {
    if (!action) return;
    setBusyId(row.id);
    setMessage(null);
    setError(null);
    try {
      if (action === "approve_layer_4") {
        await postPipelineAction({ action: "commit-workflow", ids: [row.id] });
        setMessage(`Approved ${row.employeeName} — moved to Layer 4 saved history.`);
      } else if (action === "reject") {
        await postPipelineAction({
          action: "reject-row",
          ids: [row.id],
          stage: PIPELINE_STAGES.LAYER_3_WORKFLOW,
        });
        setMessage(`Rejected ${row.employeeName} — removed from Layer 3 workflow.`);
      }
      setApprovalSelections((current) => ({ ...current, [row.id]: "" }));
      await loadRecords();
      onCommitted?.();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Approval action failed.");
      setApprovalSelections((current) => ({ ...current, [row.id]: "" }));
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
        departmentFilter={departmentFilter}
        designationFilter={designationFilter}
        departmentOptions={filterDepartmentOptions}
        designationOptions={filterDesignationOptions}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearchChange={setSearchQuery}
        onDepartmentFilterChange={setDepartmentFilter}
        onDesignationFilterChange={setDesignationFilter}
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
                    <select
                      value={approvalSelections[row.id] ?? ""}
                      disabled={busyId === row.id}
                      onChange={(event) => {
                        const value = event.target.value as PipelineApprovalAction;
                        setApprovalSelections((current) => ({ ...current, [row.id]: value }));
                        void handleLayer3Approval(row, value);
                      }}
                      className="min-w-[160px] rounded border border-corporate-border bg-white px-2 py-1.5 text-xs font-medium disabled:opacity-50"
                      aria-label={`Layer 3 approval for ${row.employeeName}`}
                    >
                      {LAYER_3_APPROVAL_OPTIONS.map((option) => (
                        <option key={option.value || "select"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
