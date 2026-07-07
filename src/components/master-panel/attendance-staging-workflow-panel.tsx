"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceStagingRow } from "@/types/attendance-staging";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type AttendanceStagingWorkflowPanelProps = {
  filterDate?: string;
  refreshToken?: number;
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
  filterDate = "",
  refreshToken = 0,
}: AttendanceStagingWorkflowPanelProps) {
  const [rows, setRows] = useState<AttendanceStagingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AttendanceStagingRow | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("shiftDate", filterDate);
      const response = await fetch(`/api/v1/attendance/staging?${params.toString()}`);
      const body = (await response.json()) as {
        rows?: AttendanceStagingRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Failed to load staging.");
      setRows(body.rows ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, refreshToken]);

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

  const handleApprove = async (row: AttendanceStagingRow) => {
    setBusyId(row.id);
    setMessage(null);
    try {
      await postAction({ action: "approve", id: row.id, approvedBy: "HR-Admin" });
      setMessage(`Approved ${row.employeeName || row.payCode}`);
      await loadRows();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approve failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveAll = async (confirm = false) => {
    setMessage(null);
    try {
      const body = await postAction({
        action: "approve-all",
        shiftDate: filterDate || undefined,
        confirm,
        approvedBy: "HR-Admin",
      });
      if (body.requiresConfirmation) {
        const ok = window.confirm(String(body.message));
        if (ok) await handleApproveAll(true);
        return;
      }
      setMessage(
        body.storageFallback
          ? `Bulk approved ${body.approved ?? 0} row(s) in cloud staging (SQL migration 012 pending).`
          : `Bulk approved ${body.approved ?? 0} row(s).`
      );
      await loadRows();
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

  const handleTransfer = async () => {
    if (!filterDate) {
      setError("Select a date before final transfer.");
      return;
    }
    try {
      const body = await postAction({
        action: "transfer",
        shiftDate: filterDate,
      });
      setMessage(
        body.storageFallback
          ? `Saved ${body.transferred ?? 0} approved row(s) to cloud master snapshot (run migration 012 for SQL transfer).`
          : `Transferred ${body.transferred ?? 0} row(s) to employee_attendance master.`
      );
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : "Transfer failed.");
    }
  };

  const pendingCount = rows.filter((r) => r.status === "Pending").length;
  const anomalyCount = rows.filter((r) => r.isAnomaly && r.status === "Pending").length;

  return (
    <section
      className="rounded-xl border-2 border-indigo-200 bg-corporate-surface p-5 shadow-card"
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
            Step 1–3: Pending draft in <strong>attendance_staging</strong> · machine times preserved ·
            edits require remark · approve locks row · audit in{" "}
            <strong>attendance_audit_log</strong>
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
            onClick={() => void handleApproveAll(false)}
            disabled={pendingCount === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Approve All ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => void handleTransfer()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 text-xs font-semibold text-indigo-900"
          >
            Transfer to Master
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
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "max-h-[480px] overflow-auto")}>
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[1400px]")}>
          <thead className={cn(MASTER_LIST_HEAD_CLASS, "sticky top-0 z-10")}>
            <tr>
              {[
                "Pay Code",
                "Employee",
                "Shift Date",
                "Machine In",
                "Machine Out",
                "Corrected In",
                "Corrected Out",
                "Duration",
                "OT",
                "Status",
                "Anomaly",
                "Actions",
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
                <td colSpan={12} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-sm text-corporate-muted">
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
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.payCode}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.employeeName || "—"}</td>
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
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <div className="flex gap-1">
                      {!row.isLocked && (
                        <>
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
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void handleApprove(row)}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                          >
                            Approve
                          </button>
                        </>
                      )}
                    </div>
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
