"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { mergeDepartmentOptions } from "@/lib/attendance-department-options";
import { mergeDesignationOptions } from "@/lib/attendance-designation-options";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { cn } from "@/lib/utils";
import {
  migrateLegacyUsersToSavedStage,
  readUsersByPipelineStage,
  transitionUserPipelineStage,
} from "@/lib/user-pipeline-store";
import {
  USER_PIPELINE_STAGES,
  type UserPipelineStage,
} from "@/types/user-pipeline";
import type { ManagedUserRecord } from "@/types/managed-user";
import LayerFilterControls from "./layer-filter-controls";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
} from "./universal-master-list";

type UserPipelineLayerPanelProps = {
  stage: UserPipelineStage;
  refreshToken?: number;
  onApproved?: () => void;
  showOtpToggle?: boolean;
  onOtpToggle?: (userId: string, enabled: boolean) => void;
};

export default function UserPipelineLayerPanel({
  stage,
  refreshToken = 0,
  onApproved,
  showOtpToggle = false,
  onOtpToggle,
}: UserPipelineLayerPanelProps) {
  const [rows, setRows] = useState<ManagedUserRecord[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { departmentNames, designationNames } = useGeneralSettings();

  const filterDepartmentOptions = useMemo(
    () => mergeDepartmentOptions([], departmentNames),
    [departmentNames]
  );

  const filterDesignationOptions = useMemo(
    () => mergeDesignationOptions([], designationNames),
    [designationNames]
  );

  const loadRows = useCallback(() => {
    setLoading(true);
    try {
      migrateLegacyUsersToSavedStage();
      setRows(
        readUsersByPipelineStage(stage, {
          fromDate,
          toDate,
          search: searchQuery,
          department: departmentFilter,
          designation: designationFilter,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [stage, fromDate, toDate, searchQuery, departmentFilter, designationFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows, refreshToken]);

  const nextStage = useMemo((): UserPipelineStage | null => {
    if (stage === USER_PIPELINE_STAGES.LAYER_2_STAGING) {
      return USER_PIPELINE_STAGES.LAYER_3_WORKFLOW;
    }
    if (stage === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW) {
      return USER_PIPELINE_STAGES.LAYER_4_SAVED;
    }
    return null;
  }, [stage]);

  const layerLabel = useMemo(() => {
    if (stage === USER_PIPELINE_STAGES.LAYER_2_STAGING) return "Layer 2 — Staging Review";
    if (stage === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW) return "Layer 3 — Active Users Workflow";
    return "Layer 4 — Saved User Records";
  }, [stage]);

  const handleApprove = (user: ManagedUserRecord) => {
    if (!nextStage) return;
    setBusyId(user.id);
    setError(null);
    try {
      const transitioned = transitionUserPipelineStage({
        ids: [user.id],
        from: stage,
        to: nextStage,
      });
      if (transitioned === 0) throw new Error("User transition failed.");
      setMessage(`Approved ${user.fullName} — moved to ${nextStage}.`);
      loadRows();
      onApproved?.();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveAll = () => {
    if (!nextStage || rows.length === 0) return;
    setError(null);
    try {
      const transitioned = transitionUserPipelineStage({
        ids: rows.map((row) => row.id),
        from: stage,
        to: nextStage,
      });
      setMessage(`Moved ${transitioned} user(s) to ${nextStage}.`);
      loadRows();
      onApproved?.();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Bulk approval failed.");
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-corporate-text">{layerLabel}</h3>
          <p className="text-xs text-corporate-muted">
            pipeline_stage = {stage} · sequential approval required
          </p>
        </div>
        {nextStage && (
          <button
            type="button"
            onClick={handleApproveAll}
            disabled={rows.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Approve All ({rows.length})
          </button>
        )}
      </div>

      <LayerFilterControls
        idPrefix={`user-${stage}`}
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
        onRefresh={loadRows}
        isRefreshing={loading}
        summary={`${rows.length} user record(s) at ${stage}`}
        searchPlaceholder="Search name, username, or role..."
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

      <div className={cn(MASTER_LIST_TABLE_WRAPPER_CLASS, "max-h-[420px] overflow-auto")}>
        <table className={cn(MASTER_LIST_TABLE_CLASS, "min-w-[900px]")}>
          <thead className={cn(MASTER_LIST_HEAD_CLASS, "sticky top-0 z-10")}>
            <tr>
              {[
                nextStage ? "Actions" : "Status",
                "Full Name",
                "Username",
                "Role",
                "Secure OTP",
                "Created",
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
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-corporate-muted">
                  No records at {stage}.
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <tr key={user.id} className="hover:bg-corporate-bg/40">
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {nextStage ? (
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => handleApprove(user)}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busyId === user.id ? "Saving..." : "Approve"}
                      </button>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        Saved
                      </span>
                    )}
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "font-medium")}>
                    {user.fullName}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{user.username}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{user.role}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {showOtpToggle && onOtpToggle ? (
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={user.otpEnabled}
                          onChange={(event) => onOtpToggle(user.id, event.target.checked)}
                          className="h-4 w-4 rounded border-corporate-border text-corporate-brand"
                          aria-label={`Enable OTP for ${user.fullName}`}
                        />
                        <span className="text-xs text-corporate-muted">OTP Login</span>
                      </label>
                    ) : user.otpEnabled ? (
                      "Enabled"
                    ) : (
                      "Disabled"
                    )}
                  </td>
                  <td className={cn(MASTER_LIST_BODY_CELL_CLASS, "text-xs text-corporate-muted")}>
                    {user.createdAt.slice(0, 10)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
