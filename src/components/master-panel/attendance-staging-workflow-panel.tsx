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
import { mergeDesignationOptions } from "@/lib/attendance-designation-options";
import {
  MANUAL_ATTENDANCE_LOG_UPDATED_EVENT,
  mergeManualEntryNamesIntoOptions,
} from "@/lib/manual-attendance-log-store";
import { cn } from "@/lib/utils";
import type { AttendanceStagingRow } from "@/types/attendance-staging";
import LayerFilterControls from "./layer-filter-controls";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AttendanceStagingRow | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manualLogRefresh, setManualLogRefresh] = useState(0);

  useEffect(() => {
    const handler = () => setManualLogRefresh((current) => current + 1);
    window.addEventListener(MANUAL_ATTENDANCE_LOG_UPDATED_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(MANUAL_ATTENDANCE_LOG_UPDATED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

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
      const response = await fetch(`/api/v1/attendance/pipeline?${params.toString()}`);
      const body = (await response.json()) as {
        rows?: AttendanceStagingRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Failed to load staging.");
      setRows(body.rows ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Load failed.";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, refreshToken]);

  const departmentOptions = useMemo(() => {
    void manualLogRefresh;
    return mergeManualEntryNamesIntoOptions(
      mergeDepartmentOptions(rows.map((row) => row.department))
    );
  }, [rows, manualLogRefresh]);

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
    } catch (departmentError) {
      setError(
        departmentError instanceof Error ? departmentError.message : "Department update failed."
      );
    } finally {
      setBusyId(null);
    }
  };

  const postAction = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/v1/attendance/staging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changedBy: "Supervisor", ...payload }),
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(body.error ?? "Action failed."));
    return body;
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
      await postAction({
        action: "edit",
        id: editRow.id,
        correctedInTime: editIn || null,
        correctedOutTime: editOut || null,
        editRemark,
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
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearchChange={setSearchQuery}
        onRefresh={() => void loadRows()}
        isRefreshing={loading}
        summary={`${rows.length} staging record(s) at LAYER_2_STAGING`}
        searchPlaceholder="Search by name or pay code..."
      />

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "max-h-[480px] overflow-auto")}>
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[1400px]")}>
          <thead className={cn(MASTER_LIST_HEAD_CLASS, "sticky top-0 z-10")}>
            <tr>
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
                <td colSpan={14} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  No staging records — upload Excel and click Save to Server (Step 1).
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    row.isAnomaly && row.status === "Pending" && "bg-amber-50/60",
                    row.status === "Approved" && "bg-emerald-50/40"
                  )}
                >
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <div className="flex gap-1">
                      {!row.isLocked && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void handleApprove(row)}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                          >
                            Approve
                          </button>
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
