"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
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
  LAYER_2_APPROVAL_OPTIONS,
  type PipelineApprovalAction,
} from "@/lib/attendance-pipeline-approval-ui";
import { useSynchronizedHorizontalScroll } from "@/hooks/use-synchronized-horizontal-scroll";
import { cn } from "@/lib/utils";
import type { AttendanceStagingRow } from "@/types/attendance-staging";
import { PIPELINE_STAGES } from "@/types/attendance-pipeline";
import LayerFilterControls from "./layer-filter-controls";
import {
  PipelineBulkActionBar,
  PipelineSelectAllCheckbox,
  usePipelineRowSelection,
  type PipelineBulkActionKind,
} from "./attendance-pipeline-bulk-selection";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type AttendanceStagingWorkflowPanelProps = {
  refreshToken?: number;
  schemaReady?: boolean;
  onApproved?: () => void;
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AttendanceStagingWorkflowPanel({
  refreshToken = 0,
  schemaReady = true,
  onApproved,
}: AttendanceStagingWorkflowPanelProps) {
  const [rows, setRows] = useState<AttendanceStagingRow[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AttendanceStagingRow | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [approvalSelections, setApprovalSelections] = useState<Record<string, PipelineApprovalAction>>({});
  const [manualLogRefresh, setManualLogRefresh] = useState(0);
  const { departmentNames, designationNames } = useGeneralSettings();

  const filterResetKey = `${fromDate}|${toDate}|${searchQuery}|${departmentFilter}|${designationFilter}|${refreshToken}`;
  const { selectedRowIds, toggleRow, clearSelection, getSelectionState } =
    usePipelineRowSelection(filterResetKey);

  const selectableRowIds = useMemo(
    () => rows.filter((row) => !row.isLocked).map((row) => row.id),
    [rows]
  );

  const { allSelected, isIndeterminate, toggleSelectAll } =
    getSelectionState(selectableRowIds);

  const { topScrollRef, tableScrollRef, scrollWidthRef } = useSynchronizedHorizontalScroll(
    `${loading}:${rows.length}:${filterResetKey}`
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        stage: "LAYER_2_STAGING",
        format: "staging",
      });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (departmentFilter) params.set("department", departmentFilter);
      if (designationFilter) params.set("designation", designationFilter);
      const response = await fetch(`/api/v1/attendance/pipeline?${params.toString()}`);
      const body = (await response.json()) as {
        rows?: AttendanceStagingRow[];
        error?: string;
        setupRequired?: boolean;
        migrationSqlUrl?: string;
      };
      if (!response.ok) {
        throw new Error(
          body.setupRequired
            ? `${body.error ?? "Layer 2 pipeline schema not ready."} Open ${body.migrationSqlUrl ?? "/api/v1/attendance/schema/migration-sql?file=013"} for migration SQL.`
            : body.error ?? "Failed to load staging."
        );
      }
      setRows(body.rows ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Load failed.";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery, departmentFilter, designationFilter]);

  const filterDepartmentOptions = useMemo(
    () => mergeDepartmentOptions([], departmentNames),
    [departmentNames]
  );

  const filterDesignationOptions = useMemo(
    () => mergeDesignationOptions([], designationNames),
    [designationNames]
  );

  useEffect(() => {
    void loadRows();
  }, [loadRows, refreshToken]);

  useEffect(() => {
    const handler = () => setManualLogRefresh((current) => current + 1);
    const refreshPipeline = () => void loadRows();
    window.addEventListener(MANUAL_ATTENDANCE_LOG_UPDATED_EVENT, handler);
    window.addEventListener(ATTENDANCE_PIPELINE_REFRESH_EVENT, refreshPipeline);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(MANUAL_ATTENDANCE_LOG_UPDATED_EVENT, handler);
      window.removeEventListener(ATTENDANCE_PIPELINE_REFRESH_EVENT, refreshPipeline);
      window.removeEventListener("storage", handler);
    };
  }, [loadRows]);

  const departmentOptions = useMemo(() => {
    void manualLogRefresh;
    return mergeManualEntryNamesIntoOptions(
      mergeDepartmentOptions(rows.map((row) => row.department), departmentNames)
    );
  }, [rows, manualLogRefresh, departmentNames]);

  const designationOptions = useMemo(() => {
    void manualLogRefresh;
    return mergeManualEntryNamesIntoOptions(
      mergeDesignationOptions(rows.map((row) => row.designation), designationNames)
    );
  }, [rows, manualLogRefresh, designationNames]);

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

  const handleDepartmentChange = async (row: AttendanceStagingRow, department: string) => {
    if (!department || department === row.department) return;
    setBusyId(row.id);
    setError(null);
    try {
      await postPipelineAction({
        action: "update-department",
        ids: [row.id],
        department,
      });
      setRows((current) =>
        current.map((entry) => (entry.id === row.id ? { ...entry, department } : entry))
      );
      setMessage(`Department updated for ${row.employeeName || row.payCode}.`);
      dispatchDepartmentMasterRefresh();
    } catch (departmentError) {
      setError(
        departmentError instanceof Error ? departmentError.message : "Department update failed."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDesignationChange = async (row: AttendanceStagingRow, designation: string) => {
    if (!designation || designation === row.designation) return;
    setBusyId(row.id);
    setError(null);
    try {
      await postPipelineAction({
        action: "update-designation",
        ids: [row.id],
        designation,
        stage: "LAYER_2_STAGING",
      });
      setRows((current) =>
        current.map((entry) => (entry.id === row.id ? { ...entry, designation } : entry))
      );
      setMessage(`Designation updated for ${row.employeeName || row.payCode}.`);
    } catch (designationError) {
      setError(
        designationError instanceof Error ? designationError.message : "Designation update failed."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleLayer2Approval = async (row: AttendanceStagingRow, action: PipelineApprovalAction) => {
    if (!action) return;
    setBusyId(row.id);
    setMessage(null);
    setError(null);
    try {
      if (action === "approve_layer_3") {
        await postPipelineAction({ action: "approve-staging", ids: [row.id] });
        setMessage(`Approved ${row.employeeName || row.payCode} — moved to Live Workflow (Layer 3).`);
      } else if (action === "reject") {
        await postPipelineAction({
          action: "reject-row",
          ids: [row.id],
          stage: PIPELINE_STAGES.LAYER_2_STAGING,
        });
        setMessage(`Rejected ${row.employeeName || row.payCode} — removed from Layer 2 staging.`);
      }
      setApprovalSelections((current) => ({ ...current, [row.id]: "" }));
      await loadRows();
      onApproved?.();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Approval action failed.");
      setApprovalSelections((current) => ({ ...current, [row.id]: "" }));
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (row: AttendanceStagingRow) => {
    setBusyId(row.id);
    setMessage(null);
    try {
      await postPipelineAction({ action: "approve-staging", ids: [row.id] });
      setMessage(`Approved ${row.employeeName || row.payCode} — moved to Live Workflow (Layer 3).`);
      await loadRows();
      onApproved?.();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approve failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkAction = async (action: PipelineBulkActionKind) => {
    const ids = Array.from(selectedRowIds).filter((id) => selectableRowIds.includes(id));
    if (ids.length === 0) return;

    if (action === "approve") {
      const selectedRows = rows.filter((row) => ids.includes(row.id));
      const anomalyCount = selectedRows.filter((row) => row.isAnomaly || row.editRemark).length;
      if (anomalyCount > 0) {
        const ok = window.confirm(
          `${anomalyCount} selected record(s) have anomalies or edits — confirm bulk approve to Layer 3?`
        );
        if (!ok) return;
      }
    }

    setBulkBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (action === "approve") {
        const body = await postPipelineAction({ action: "approve-staging", ids });
        setMessage(`Approved ${body.transitioned ?? ids.length} row(s) — moved to Live Workflow (Layer 3).`);
      } else {
        const body = await postPipelineAction({
          action: "reject-row",
          ids,
          stage: PIPELINE_STAGES.LAYER_2_STAGING,
        });
        setMessage(`Rejected ${body.rejected ?? ids.length} row(s) — removed from Layer 2 staging.`);
      }
      clearSelection();
      await loadRows();
      onApproved?.();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleApproveAll = async () => {
    setMessage(null);
    try {
      const pendingIds = rows.filter((r) => r.status === "Pending" && !r.isLocked).map((r) => r.id);
      if (pendingIds.length === 0) return;
      const anomalyCount = rows.filter((r) => r.isAnomaly || r.editRemark).length;
      if (anomalyCount > 0) {
        const ok = window.confirm(
          `${anomalyCount} record(s) have anomalies or edits — confirm bulk approve to Layer 3?`
        );
        if (!ok) return;
      }
      const body = await postPipelineAction({ action: "approve-all-staging", ids: pendingIds });
      setMessage(`Moved ${body.transitioned ?? 0} row(s) to Live Workflow (Layer 3).`);
      await loadRows();
      onApproved?.();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Bulk approve failed.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editRow || !editRemark.trim()) {
      setError("Edit remark is required.");
      return;
    }
    setBusyId(editRow.id);
    try {
      await postPipelineAction({
        action: "edit-staging-row",
        ids: [editRow.id],
        correctedInTime: editIn || null,
        correctedOutTime: editOut || null,
        editRemark,
        stage: PIPELINE_STAGES.LAYER_2_STAGING,
      });
      setEditRow(null);
      setEditRemark("");
      setMessage("Edit saved with audit trail.");
      await loadRows();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Edit failed.");
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = rows.filter((r) => r.status === "Pending").length;
  const anomalyCount = rows.filter((r) => r.isAnomaly && r.status === "Pending").length;

  return (
    <section
      className="min-h-[320px] rounded-xl border-2 border-indigo-200 bg-corporate-surface p-5 shadow-card"
      aria-label="Layer 2 — Biometric attendance staging workflow"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
            Layer 2
          </p>
          <h3 className="text-base font-bold text-corporate-text">
            Biometric Attendance — Staging Review &amp; Approval
          </h3>
          <p className="mt-1 text-xs text-corporate-muted">
            Step 1–3: Layer 2 staging only (<strong>pipeline_stage = LAYER_2_STAGING</strong>) · approve
            advances rows to Layer 3 workflow · no skip allowed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadRows()}
            disabled={loading}
            className="btn-secondary inline-flex h-9 items-center gap-2 px-3 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleApproveAll()}
            disabled={pendingCount === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Approve All to Layer 3 ({pendingCount})
          </button>
        </div>
      </div>

      {anomalyCount > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {anomalyCount} pending record(s) flagged with anomalies — review before bulk approve.
        </div>
      )}

      {message && (
        <p className="mb-3 flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {message}
        </p>
      )}
      {!schemaReady && rows.length === 0 && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No Layer 2 staging records — upload Excel in Layer 1 to ingest rows at LAYER_2_STAGING.
        </p>
      )}
      {error && schemaReady && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <LayerFilterControls
        idPrefix="layer-2-staging"
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
        onRefresh={() => void loadRows()}
        isRefreshing={loading}
        summary={`${rows.length} staging record(s) at LAYER_2_STAGING`}
        searchPlaceholder="Search by name or pay code..."
      />

      <PipelineBulkActionBar
        selectedCount={selectedRowIds.size}
        isBusy={bulkBusy}
        approveLabel="Approve All to Layer 3"
        rejectLabel="Reject All"
        onBulkAction={(action) => void handleBulkAction(action)}
      />

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "max-h-[480px]")}>
        <div
          ref={topScrollRef}
          className="workspace-table-scroll overflow-x-auto overflow-y-hidden border-b border-corporate-border/80"
          aria-label="Layer 2 staging horizontal scroll (top)"
        >
          <div ref={scrollWidthRef} className="h-3" aria-hidden />
        </div>
        <div ref={tableScrollRef} className="workspace-table-scroll max-h-[440px] overflow-auto">
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[1400px]")}>
          <thead className={cn(MASTER_LIST_HEAD_CLASS, "sticky top-0 z-10")}>
            <tr>
              <th className={cn(MASTER_LIST_HEADER_CELL_CLASS, "w-10 text-center")}>
                <PipelineSelectAllCheckbox
                  checked={allSelected}
                  indeterminate={isIndeterminate}
                  disabled={loading || selectableRowIds.length === 0 || bulkBusy}
                  onChange={toggleSelectAll}
                  ariaLabel="Select all visible staging rows"
                />
              </th>
              {[
                "Actions",
                "Pay Code",
                "Employee",
                "Department",
                "Designation",
                "Shift Date",
                "Machine In",
                "Machine Out",
                "Corrected In",
                "Corrected Out",
                "Duration",
                "OT",
                "Status",
                "Anomaly",
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
                <td colSpan={15} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  No staging records — upload Excel and click Save to Server (Step 1).
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    row.isAnomaly && row.status === "Pending" && "bg-amber-50/60",
                    row.status === "Approved" && "bg-emerald-50/40",
                    selectedRowIds.has(row.id) && "bg-corporate-brand-light/40"
                  )}
                >
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-center")}>
                    {!row.isLocked ? (
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(row.id)}
                        disabled={bulkBusy || busyId === row.id}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select ${row.employeeName || row.payCode}`}
                        className="h-4 w-4 rounded border-corporate-border"
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <div className="flex flex-col gap-1">
                      {!row.isLocked && (
                        <>
                          <select
                            value={approvalSelections[row.id] ?? ""}
                            disabled={busyId === row.id}
                            onChange={(event) => {
                              const value = event.target.value as PipelineApprovalAction;
                              setApprovalSelections((current) => ({ ...current, [row.id]: value }));
                              void handleLayer2Approval(row, value);
                            }}
                            className="min-w-[160px] rounded border border-corporate-border bg-white px-2 py-1 text-xs font-medium"
                            aria-label={`Layer 2 approval for ${row.employeeName || row.payCode}`}
                          >
                            {LAYER_2_APPROVAL_OPTIONS.map((option) => (
                              <option key={option.value || "select"} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setEditRow(row);
                              setEditIn(row.correctedInTime ?? row.machineInTime ?? "");
                              setEditOut(row.correctedOutTime ?? row.machineOutTime ?? "");
                              setEditRemark("");
                            }}
                            className="rounded border border-corporate-border px-2 py-1 text-xs"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.payCode}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.employeeName || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {!row.isLocked ? (
                      <select
                        value={row.department || ""}
                        disabled={busyId === row.id}
                        onChange={(event) => void handleDepartmentChange(row, event.target.value)}
                        className="min-w-[140px] rounded border border-corporate-border bg-white px-2 py-1 text-xs"
                        aria-label={`Department for ${row.employeeName || row.payCode}`}
                      >
                        <option value="">Select department</option>
                        {departmentOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.department || "—"
                    )}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {!row.isLocked ? (
                      <select
                        value={row.designation || ""}
                        disabled={busyId === row.id}
                        onChange={(event) =>
                          void handleDesignationChange(row, event.target.value)
                        }
                        className="min-w-[140px] rounded border border-corporate-border bg-white px-2 py-1 text-xs"
                        aria-label={`Designation for ${row.employeeName || row.payCode}`}
                      >
                        <option value="">Select designation</option>
                        {designationOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.designation || "—"
                    )}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.shiftDate}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{formatTime(row.machineInTime)}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{formatTime(row.machineOutTime)}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {formatTime(row.correctedInTime)}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {formatTime(row.correctedOutTime)}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.duration || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.otHours || "—"}</td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-semibold")}>
                    {row.isLocked && <Lock className="mr-1 inline h-3 w-3" aria-hidden />}
                    {row.status}
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "max-w-[180px] truncate text-xs")}>
                    {row.isAnomaly ? row.anomalyReason : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h4 className="text-sm font-bold text-corporate-text">
              Edit Times — {editRow.employeeName || editRow.payCode}
            </h4>
            <p className="mt-1 text-xs text-corporate-muted">
              Machine times stay unchanged. Corrected values + remark are audit-logged.
            </p>
            <label className="mt-3 block text-xs font-semibold">
              Corrected In
              <input
                type="text"
                value={editIn}
                onChange={(e) => setEditIn(e.target.value)}
                className="mt-1 w-full rounded border border-corporate-border px-2 py-2 text-sm"
                placeholder="HH:MM"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold">
              Corrected Out
              <input
                type="text"
                value={editOut}
                onChange={(e) => setEditOut(e.target.value)}
                className="mt-1 w-full rounded border border-corporate-border px-2 py-2 text-sm"
                placeholder="HH:MM"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold">
              Remark (required)
              <textarea
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                className="mt-1 w-full rounded border border-corporate-border px-2 py-2 text-sm"
                rows={3}
                placeholder="Reason for edit..."
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="rounded border border-corporate-border px-3 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                className="rounded bg-corporate-brand px-3 py-2 text-xs font-semibold text-white"
              >
                Save Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
