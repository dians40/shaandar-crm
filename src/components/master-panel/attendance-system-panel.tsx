"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { LIST_SEARCH_EMPTY_MESSAGE } from "@/lib/list-search-filter";
import type { AttendanceWorkflowRecord } from "@/types/attendance-workflow";
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
  const [records, setRecords] = useState<AttendanceWorkflowRecord[]>([]);
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
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const query = params.toString();
      const response = await fetch(
        query ? `/api/v1/attendance/workflow?${query}` : "/api/v1/attendance/workflow"
      );
      const body = (await response.json()) as {
        records?: AttendanceWorkflowRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Failed to load workflow records.");
      setRecords(body.records ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, refreshToken]);

  const handleApprove = async (record: AttendanceWorkflowRecord) => {
    setBusyId(record.id);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/attendance/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit-workflow", ids: [record.id] }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error ?? "Approval failed."));
      setMessage(`Approved ${record.employeeName} — moved to Layer 4 saved history.`);
      await loadRecords();
      onCommitted?.();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveAll = async () => {
    if (records.length === 0) return;
    setMessage(null);
    try {
      const ids = records.map((row) => row.id);
      const response = await fetch("/api/v1/attendance/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit-all-workflow", ids }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error ?? "Bulk approval failed."));
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
          Layer 3 only — records with pipeline_stage LAYER_3_WORKFLOW. Empty until Layer 2
          approval. Final approval saves rows to Layer 4 history.
        </p>
        <button
          type="button"
          onClick={() => void handleApproveAll()}
          disabled={records.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Approve All to Layer 4 ({records.length})
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
        summary={`${records.length} workflow record(s) at LAYER_3_WORKFLOW`}
        searchPlaceholder="Search employee, date, punch..."
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
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[900px]")}>
          <thead className={cn(MASTER_LIST_HEAD_CLASS, "sticky top-0 z-10")}>
            <tr>
              {["Actions", "Employee", "Date", "Punch In", "Punch Out", "Pay Code"].map((label) => (
                <th key={label} className={MASTER_LIST_HEADER_CELL_CLASS}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-corporate-muted">
                  <CalendarCheck className="mx-auto mb-2 h-6 w-6 opacity-60" aria-hidden />
                  {searchQuery.trim()
                    ? LIST_SEARCH_EMPTY_MESSAGE
                    : "No Layer 3 records — approve uploads in Layer 2 first."}
                </td>
              </tr>
            ) : (
              records.map((row) => (
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
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.attendanceDate}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.punchIn || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.punchOut || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.employeeId || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
