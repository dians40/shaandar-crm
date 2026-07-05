"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { SelectInput } from "@/components/forms/form-fields";
import { useAttendanceWorkflow } from "@/hooks/use-attendance-workflow";
import { useEmployees } from "@/hooks/use-employees";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import type { AttendanceWorkflowRecord } from "@/types/attendance-workflow";
import {
  VERIFICATION_STAGE_LABELS,
  type VerificationStage,
} from "@/types/verification-workflow";
import MultiPhotoUploader from "./shared/multi-photo-uploader";
import VerificationStagePills from "./shared/verification-stage-pills";
import {
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  UniversalMasterListShell,
  UniversalMasterListTable,
} from "./universal-master-list";

async function patchAttendanceWorkflow(record: AttendanceWorkflowRecord) {
  try {
    await fetch("/api/v1/attendance/workflow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch {
    // localStorage remains authoritative when API unavailable
  }
}

export default function AttendanceSystemPanel() {
  const { employees } = useEmployees();
  const { machineOptions, isReady: settingsReady } = useGeneralSettings();
  const {
    records,
    payrollTally,
    isReady,
    ingestBiometricLog,
    updateRecord,
    commitToPayrollTally,
    syncFromApi,
  } = useAttendanceWorkflow();

  const [activeStage, setActiveStage] = useState<VerificationStage>("pending_allocation");
  const [searchQuery, setSearchQuery] = useState("");
  const [machineDrafts, setMachineDrafts] = useState<Record<string, string>>({});
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, string[]>>({});

  const resetPanelState = useCallback(() => {
    setActiveStage("pending_allocation");
    setSearchQuery("");
    setMachineDrafts({});
    setPhotoDrafts({});
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<VerificationStage, number>> = {};
    for (const row of records) {
      counts[row.workflowStage] = (counts[row.workflowStage] ?? 0) + 1;
    }
    return counts;
  }, [records]);

  const filtered = useMemo(
    () =>
      records.filter(
        (row) =>
          row.workflowStage === activeStage &&
          matchesUniversalNameSearch(searchQuery, row.employeeName, [
            row.attendanceDate,
            row.punchIn,
            row.punchOut,
            row.assignedMachine,
          ])
      ),
    [records, activeStage, searchQuery]
  );

  const payrollDaysLogged = useMemo(
    () => Object.values(payrollTally).reduce((sum, value) => sum + value, 0),
    [payrollTally]
  );

  const applyUpdate = useCallback(
    (record: AttendanceWorkflowRecord) => {
      updateRecord(record.id, record);
      void patchAttendanceWorkflow(record);
    },
    [updateRecord]
  );

  const handleAssignMachine = (record: AttendanceWorkflowRecord) => {
    const machine = (machineDrafts[record.id] ?? "").trim();
    if (!machine) return;
    applyUpdate({
      ...record,
      assignedMachine: machine,
      workflowStage: "operator_verification",
    });
  };

  const handleOperatorVerify = (record: AttendanceWorkflowRecord) => {
    applyUpdate({
      ...record,
      workflowStage: "supervisor_approval",
      operatorVerifiedAt: new Date().toISOString(),
      operatorVerifiedBy: "Machine Operator",
    });
  };

  const handleSupervisorApprove = (record: AttendanceWorkflowRecord) => {
    const photos = photoDrafts[record.id] ?? [];
    if (photos.length === 0) return;
    applyUpdate({
      ...record,
      attachmentPhotos: photos,
      workflowStage: "finalized",
      supervisorApprovedAt: new Date().toISOString(),
      supervisorApprovedBy: "Supervisor",
    });
    commitToPayrollTally(record.employeeId, record.attendanceDate);
  };

  if (!isReady || !settingsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading Attendance System...
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <aside>
        <VerificationStagePills
          activeStage={activeStage}
          onChange={setActiveStage}
          counts={stageCounts}
        />
      </aside>

      <div className="space-y-5">
        <div className="rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-corporate-text">
                {VERIFICATION_STAGE_LABELS[activeStage]}
              </h2>
              <p className="text-sm text-corporate-muted">
                Biometric logs enter Stage 1 automatically via the API gateway webhook.
              </p>
              <p className="mt-1 text-xs text-corporate-muted">
                Monthly payroll attendance days committed:{" "}
                <span className="font-semibold text-corporate-text">{payrollDaysLogged}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void syncFromApi()}
              className="inline-flex items-center gap-1.5 rounded-full border border-corporate-border px-4 py-2 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Sync API Queue
            </button>
          </div>
        </div>

        <UniversalMasterListShell
          moduleName="Attendance"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        >
          <UniversalMasterListTable>
            <thead className={MASTER_LIST_HEAD_CLASS}>
              <tr>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Punch In / Out</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Machine</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    <CalendarCheck className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    {searchQuery.trim()
                      ? LIST_SEARCH_EMPTY_MESSAGE
                      : `No records in ${VERIFICATION_STAGE_LABELS[activeStage]}.`}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-medium">{row.employeeName}</td>
                    <td className="px-4 py-3 text-sm">{row.attendanceDate}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.punchIn || "—"}
                      {row.punchOut ? ` → ${row.punchOut}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.assignedMachine || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {activeStage === "pending_allocation" && (
                        <div className="flex min-w-[220px] flex-col gap-2">
                          <SelectInput
                            label=""
                            value={machineDrafts[row.id] ?? ""}
                            placeholder="Select machine"
                            options={machineOptions}
                            onChange={(e) =>
                              setMachineDrafts((prev) => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleAssignMachine(row)}
                            className="rounded-full bg-corporate-brand px-4 py-1.5 text-xs font-semibold text-white"
                          >
                            Assign Machine & Forward
                          </button>
                        </div>
                      )}
                      {activeStage === "operator_verification" && (
                        <button
                          type="button"
                          onClick={() => handleOperatorVerify(row)}
                          className="rounded-full bg-corporate-brand px-4 py-2 text-xs font-semibold text-white"
                        >
                          Verify & Approve Operator Shift
                        </button>
                      )}
                      {activeStage === "supervisor_approval" && (
                        <div className="min-w-[260px] space-y-2">
                          <MultiPhotoUploader
                            photos={photoDrafts[row.id] ?? []}
                            onChange={(photos) =>
                              setPhotoDrafts((prev) => ({ ...prev, [row.id]: photos }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleSupervisorApprove(row)}
                            disabled={(photoDrafts[row.id] ?? []).length === 0}
                            className="rounded-full bg-corporate-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Grant Final Approval
                          </button>
                        </div>
                      )}
                      {activeStage === "finalized" && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Committed to Payroll
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </UniversalMasterListTable>
        </UniversalMasterListShell>

        {process.env.NODE_ENV === "development" && employees[0] && (
          <button
            type="button"
            onClick={() =>
              ingestBiometricLog({
                employeeId: employees[0].id,
                employeeName: employees[0].name,
                attendanceDate: new Date().toISOString().slice(0, 10),
                punchIn: new Date().toISOString(),
                punchOut: "",
              })
            }
            className="rounded-full border border-dashed border-corporate-border px-4 py-2 text-xs text-corporate-muted"
          >
            Dev: Simulate biometric log for first employee
          </button>
        )}
      </div>
    </div>
  );
}
