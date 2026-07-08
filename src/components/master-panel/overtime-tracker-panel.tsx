"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import SearchableSelectInput from "@/components/forms/searchable-select-input";
import { useEmployees } from "@/hooks/use-employees";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { useOvertimeRecords } from "@/hooks/use-overtime";
import { splitAssignedFromGroup } from "@/lib/employee-assigned-from";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import {
  MASTER_PANEL_ENTITY_SELECTED_EVENT,
  readMasterPanelSelection,
} from "@/lib/master-panel-entity-bridge";
import {
  LAYER_2_APPROVAL_OPTIONS,
  LAYER_3_APPROVAL_OPTIONS,
  LAYER_4_APPROVAL_OPTIONS,
  type PipelineApprovalAction,
} from "@/lib/attendance-pipeline-approval-ui";
import {
  PAYROLL_SHIFT_OPTIONS,
  validatePayrollShiftOrTime,
} from "@/lib/overtime-shift-config";
import {
  calculateOvertimePayout,
  EMPTY_OVERTIME_FORM,
  resolvePayrollTotalHours,
  type OvertimeRecord,
} from "@/types/overtime";
import {
  OVERTIME_PIPELINE_STAGES,
  OVERTIME_PIPELINE_STAGE_LABELS,
  type OvertimePipelineStage,
} from "@/types/overtime-pipeline";
import { cn } from "@/lib/utils";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import DailyOtPayslip from "./shared/daily-ot-payslip";
import UniversalRecordProfile from "./universal-record-profile";
import {
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  UniversalMasterListShell,
  UniversalMasterListTable,
  useMasterListFilters,
} from "./universal-master-list";

const DEPARTMENT_CUSTOM_VALUE = "__custom_department__";

const OVERTIME_LAYER_TABS: OvertimePipelineStage[] = [
  OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING,
  OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW,
  OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED,
];

type ViewMode = "list" | "add" | "edit" | "detail";

function resolveContractorFromEmployee(assignedFromGroup: string): string {
  return splitAssignedFromGroup(assignedFromGroup).assignedContractor ?? "";
}

export default function OvertimeTrackerPanel() {
  const { employees, isLoading: employeesLoading } = useEmployees();
  const {
    departmentOptions,
    overtimeReasonOptions,
    isReady: settingsReady,
  } = useGeneralSettings();
  const {
    records,
    isReady,
    addRecord,
    updateRecord,
    approveLayer2ToLayer3,
    approveLayer3ToLayer4,
    rejectPipelineRow,
    commitToLedger,
    markAsPaid,
  } = useOvertimeRecords();
  const [view, setView] = useState<ViewMode>("list");
  const [activeLayer, setActiveLayer] = useState<OvertimePipelineStage>(
    OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING
  );
  const [departmentDrafts, setDepartmentDrafts] = useState<Record<string, string>>({});
  const [approvalSelections, setApprovalSelections] = useState<
    Record<string, PipelineApprovalAction>
  >({});
  const [payslipId, setPayslipId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_OVERTIME_FORM);
  const [departmentSelect, setDepartmentSelect] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => records.find((row) => row.id === viewingId) ?? null,
    [records, viewingId]
  );

  const layerCounts = useMemo(() => {
    const counts: Partial<Record<OvertimePipelineStage, number>> = {};
    for (const row of records) {
      if (row.pipelineStage === OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED && row.paymentStatus === "paid") {
        continue;
      }
      counts[row.pipelineStage] = (counts[row.pipelineStage] ?? 0) + 1;
    }
    return counts;
  }, [records]);

  const payslipRecord = useMemo(
    () => records.find((row) => row.id === payslipId) ?? null,
    [records, payslipId]
  );

  const totalHours = useMemo(
    () =>
      resolvePayrollTotalHours({
        shiftType: form.shiftType,
        fromTime: form.fromTime,
        toTime: form.toTime,
      }),
    [form.shiftType, form.fromTime, form.toTime]
  );

  const selectedEmployeeRate = useMemo(
    () => employees.find((row) => row.id === form.employeeId)?.overtimeHourlyRate ?? 0,
    [employees, form.employeeId]
  );

  const autoOvertimePayout = useMemo(
    () => calculateOvertimePayout(totalHours, selectedEmployeeRate),
    [totalHours, selectedEmployeeRate]
  );

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: employee.name,
      })),
    [employees]
  );

  const substituteOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.name,
        label: employee.name,
      })),
    [employees]
  );

  const departmentSelectOptions = useMemo(() => {
    const masterLabels = departmentOptions.map((option) => option.label);
    return [
      ...masterLabels.map((label) => ({ value: label, label })),
      { value: DEPARTMENT_CUSTOM_VALUE, label: "Other / type manually" },
    ];
  }, [departmentOptions]);

  const applySelectedEmployee = (employeeId: string, employeeName: string) => {
    const employee = employees.find((row) => row.id === employeeId);
    const contractor = resolveContractorFromEmployee(employee?.assignedFromGroup ?? "");
    const hourlyRate = employee?.overtimeHourlyRate ?? 0;
    setForm((prev) => {
      const hours = resolvePayrollTotalHours({
        shiftType: prev.shiftType,
        fromTime: prev.fromTime,
        toTime: prev.toTime,
      });
      return {
        ...prev,
        employeeId,
        employeeName,
        assignedFromGroup: contractor,
        amountPaidToday:
          hourlyRate > 0
            ? hours > 0
              ? calculateOvertimePayout(hours, hourlyRate)
              : hourlyRate
            : prev.amountPaidToday,
      };
    });
  };

  const consumePendingEmployeeSelection = () => {
    const selection = readMasterPanelSelection();
    if (selection?.entityType === "employee" && selection.entityId) {
      applySelectedEmployee(selection.entityId, selection.entityName);
    }
  };

  useEffect(() => {
    if (!form.employeeId || selectedEmployeeRate <= 0) return;
    setForm((prev) => ({
      ...prev,
      amountPaidToday:
        totalHours > 0
          ? calculateOvertimePayout(totalHours, selectedEmployeeRate)
          : selectedEmployeeRate,
    }));
  }, [form.employeeId, selectedEmployeeRate, totalHours]);

  const syncDepartmentFields = (assignedMachine: string) => {
    const knownValues = departmentSelectOptions.map((option) => option.value);
    if (!assignedMachine) {
      setDepartmentSelect("");
      setCustomDepartment("");
      return;
    }
    if (knownValues.includes(assignedMachine)) {
      setDepartmentSelect(assignedMachine);
      setCustomDepartment("");
      return;
    }
    setDepartmentSelect(DEPARTMENT_CUSTOM_VALUE);
    setCustomDepartment(assignedMachine);
  };

  const resetForm = () => {
    setForm(EMPTY_OVERTIME_FORM);
    setDepartmentSelect("");
    setCustomDepartment("");
    setEditingId(null);
    setError(null);
  };

  const resetPanelState = useCallback(() => {
    resetForm();
    setView("list");
    setSearchQuery("");
    setViewingId(null);
    setActiveLayer(OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING);
    setDepartmentDrafts({});
    setApprovalSelections({});
    setPayslipId(null);
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

  const openAdd = () => {
    resetForm();
    consumePendingEmployeeSelection();
    setView("add");
  };

  const openEdit = (record: OvertimeRecord) => {
    setEditingId(record.id);
    setForm({
      workDate: record.workDate,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      assignedFromGroup: resolveContractorFromEmployee(record.assignedFromGroup),
      shiftType: record.shiftType,
      fromTime: record.fromTime,
      toTime: record.toTime,
      amountPaidToday: record.amountPaidToday,
      assignedMachine: record.assignedMachine,
      overtimeReason: record.overtimeReason,
      workLocation: record.workLocation,
      workLocationAssignment: record.workLocationAssignment,
      narration: record.narration,
      pipelineStage: record.pipelineStage,
      workflowStage: record.workflowStage,
      paymentStatus: record.paymentStatus,
      operatorVerifiedAt: record.operatorVerifiedAt,
      operatorVerifiedBy: record.operatorVerifiedBy,
      supervisorApprovedAt: record.supervisorApprovedAt,
      supervisorApprovedBy: record.supervisorApprovedBy,
      attachmentPhotos: record.attachmentPhotos,
    });
    syncDepartmentFields(record.assignedMachine);
    setView("edit");
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((row) => row.id === employeeId);
    applySelectedEmployee(employeeId, employee?.name ?? "");
  };

  const handleDepartmentSelectChange = (value: string) => {
    setDepartmentSelect(value);
    if (value === DEPARTMENT_CUSTOM_VALUE) {
      setForm((prev) => ({ ...prev, assignedMachine: customDepartment }));
      return;
    }
    setCustomDepartment("");
    setForm((prev) => ({ ...prev, assignedMachine: value }));
  };

  const handleSave = () => {
    const resolvedDepartment =
      departmentSelect === DEPARTMENT_CUSTOM_VALUE
        ? customDepartment.trim()
        : form.assignedMachine.trim();

    const shiftTimeError = validatePayrollShiftOrTime({
      shiftType: form.shiftType,
      fromTime: form.fromTime,
      toTime: form.toTime,
    });

    if (
      !form.employeeId ||
      !form.workDate ||
      !form.overtimeReason.trim() ||
      !form.workLocationAssignment.trim() ||
      shiftTimeError
    ) {
      setError(
        shiftTimeError ??
          "Work date, employee, overtime reason, and Substitute For are required."
      );
      return;
    }

    const payload = {
      ...form,
      assignedFromGroup: resolveContractorFromEmployee(
        employees.find((row) => row.id === form.employeeId)?.assignedFromGroup ?? form.assignedFromGroup
      ),
      assignedMachine: resolvedDepartment,
      workLocation: form.workLocationAssignment,
      amountPaidToday: Number(form.amountPaidToday) || 0,
      pipelineStage: OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING,
      workflowStage: "pending_allocation" as const,
      paymentStatus: "due" as const,
      operatorVerifiedAt: null,
      operatorVerifiedBy: null,
      supervisorApprovedAt: null,
      supervisorApprovedBy: null,
      attachmentPhotos: [],
    };

    if (view === "edit" && editingId) {
      const existing = records.find((row) => row.id === editingId);
      updateRecord(editingId, {
        ...payload,
        pipelineStage: existing?.pipelineStage ?? OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING,
        workflowStage: existing?.workflowStage ?? "pending_allocation",
        paymentStatus: existing?.paymentStatus ?? "due",
        operatorVerifiedAt: existing?.operatorVerifiedAt ?? null,
        operatorVerifiedBy: existing?.operatorVerifiedBy ?? null,
        supervisorApprovedAt: existing?.supervisorApprovedAt ?? null,
        supervisorApprovedBy: existing?.supervisorApprovedBy ?? null,
        attachmentPhotos: existing?.attachmentPhotos ?? [],
      });
    } else {
      addRecord(payload);
    }

    resetForm();
    setView("list");
    setActiveLayer(OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING);
  };

  const handleLayerApproval = (record: OvertimeRecord, action: PipelineApprovalAction) => {
    if (!action) return;
    if (action === "reject") {
      rejectPipelineRow(record.id);
      return;
    }
    if (
      record.pipelineStage === OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING &&
      action === "approve_layer_3"
    ) {
      approveLayer2ToLayer3(record.id);
      return;
    }
    if (
      record.pipelineStage === OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW &&
      action === "approve_layer_4"
    ) {
      approveLayer3ToLayer4(record.id);
      return;
    }
    if (
      record.pipelineStage === OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED &&
      action === "save_archive"
    ) {
      commitToLedger(record.id);
    }
    setApprovalSelections((prev) => ({ ...prev, [record.id]: "" }));
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ entityType?: string; entityId?: string; entityName?: string }>).detail;
      if (detail?.entityType === "employee" && detail.entityId) {
        resetForm();
        applySelectedEmployee(detail.entityId, detail.entityName ?? "");
        setView("add");
      }
    };

    window.addEventListener(MASTER_PANEL_ENTITY_SELECTED_EVENT, handler);
    return () => window.removeEventListener(MASTER_PANEL_ENTITY_SELECTED_EVENT, handler);
  }, []);

  if (!isReady || !settingsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading overtime records...
      </div>
    );
  }

  if (payslipRecord) {
    return (
      <>
        <ModuleAddListTabBar
          moduleName="Overtime"
          active="list"
          onList={() => {
            setPayslipId(null);
            setView("list");
          }}
          onAdd={openAdd}
        />
        <DailyOtPayslip
          record={payslipRecord}
          onMarkPaid={() => {
            markAsPaid(payslipRecord.id);
            setPayslipId(null);
          }}
          onBack={() => setPayslipId(null)}
        />
      </>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <UniversalRecordProfile
        title={viewingRecord.employeeName}
        subtitle={`${viewingRecord.workDate} · ${viewingRecord.overtimeReason || viewingRecord.shiftType}`}
        fields={[
          { label: "Work Date", value: viewingRecord.workDate },
          { label: "Contractor", value: viewingRecord.assignedFromGroup || "—" },
          { label: "Overtime Reason", value: viewingRecord.overtimeReason || "—" },
          { label: "Shift Type", value: viewingRecord.shiftType || "—" },
          { label: "From Time", value: viewingRecord.fromTime || "—" },
          { label: "To Time", value: viewingRecord.toTime || "—" },
          { label: "Total Hours", value: viewingRecord.totalHours },
          {
            label: "Amount Paid Today",
            value: `₹${viewingRecord.amountPaidToday.toLocaleString("en-IN")}`,
          },
          { label: "Assigned Department", value: viewingRecord.assignedMachine || "—" },
          { label: "Substitute For", value: viewingRecord.workLocationAssignment || "—" },
          { label: "Pipeline Stage", value: OVERTIME_PIPELINE_STAGE_LABELS[viewingRecord.pipelineStage] },
          { label: "Narration", value: viewingRecord.narration },
        ]}
        onBack={() => {
          setViewingId(null);
          setView("list");
        }}
        onEdit={() => openEdit(viewingRecord)}
      />
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <>
        <ModuleAddListTabBar
          moduleName="Overtime"
          active="add"
          onList={() => {
            resetForm();
            setView("list");
          }}
          onAdd={openAdd}
        />
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Overtime" : "Edit Overtime"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Independent day-by-day overtime logging with immediate cash payout — not linked to monthly salary.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Work Date"
              type="date"
              required
              value={form.workDate}
              onChange={(e) => setForm((prev) => ({ ...prev, workDate: e.target.value }))}
            />
            <SearchableSelectInput
              id="overtime-employee"
              label="Employee Name"
              required
              disabled={employeesLoading}
              value={form.employeeId}
              placeholder="Search employee name..."
              onChange={handleEmployeeChange}
              options={employeeOptions}
              hint="Searchable filter for large labor volumes"
            />
            <TextInput
              label="Contractor"
              readOnly
              value={form.assignedFromGroup || ""}
              placeholder="Auto-linked when employee has contractor assignment"
              className="bg-corporate-bg"
              hint="Auto-populated from Employee Master contractor link; blank when firm-only"
            />
            <SelectInput
              label="Overtime Reason"
              required
              value={form.overtimeReason}
              placeholder="Select overtime reason"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, overtimeReason: e.target.value }))
              }
              options={overtimeReasonOptions}
            />
            <SelectInput
              label="Shift Type"
              value={form.shiftType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  shiftType: e.target.value as typeof form.shiftType,
                }))
              }
              options={PAYROLL_SHIFT_OPTIONS}
              hint="Optional when From/To time is provided"
            />
            <TextInput
              label="From Time (HH:MM)"
              placeholder="18:00"
              value={form.fromTime}
              onChange={(e) => setForm((prev) => ({ ...prev, fromTime: e.target.value }))}
              hint="Optional when Shift Type is selected"
            />
            <TextInput
              label="To Time (HH:MM)"
              placeholder="22:00"
              value={form.toTime}
              onChange={(e) => setForm((prev) => ({ ...prev, toTime: e.target.value }))}
              hint="Optional when Shift Type is selected"
            />
            <TextInput
              label="Total Hours"
              readOnly
              value={String(totalHours)}
              className="bg-corporate-bg"
              hint="12 hr for DY1/G11, 6 hr for Half Shift, or calculated from time range"
            />
            <TextInput
              label="Amount Paid Today (Day-by-Day Cash System)"
              type="number"
              min="0"
              step="0.01"
              required
              readOnly={selectedEmployeeRate > 0 && totalHours > 0}
              value={String(
                selectedEmployeeRate > 0 && totalHours > 0
                  ? autoOvertimePayout
                  : form.amountPaidToday
              )}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amountPaidToday: Number(e.target.value) }))
              }
              hint={
                selectedEmployeeRate > 0
                  ? `Default from Employee Master OT rate ₹${selectedEmployeeRate}/hr${
                      totalHours > 0 ? ` × ${totalHours} hr` : ""
                    }`
                  : "Set Overtime Hourly Rate in Employee Master or enter amount manually"
              }
            />
            <SelectInput
              label="Assigned Department"
              value={departmentSelect}
              placeholder="Select department"
              onChange={(e) => handleDepartmentSelectChange(e.target.value)}
              options={departmentSelectOptions}
              hint="Dynamic options from General Settings — Department master"
            />
            {departmentSelect === DEPARTMENT_CUSTOM_VALUE && (
              <TextInput
                label="Department name (manual entry)"
                value={customDepartment}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomDepartment(value);
                  setForm((prev) => ({ ...prev, assignedMachine: value }));
                }}
              />
            )}
            <SearchableSelectInput
              id="overtime-substitute"
              label="Substitute For"
              required
              value={form.workLocationAssignment}
              placeholder="Search person name..."
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  workLocationAssignment: value,
                  workLocation: value,
                }))
              }
              options={substituteOptions}
              hint="Search and select the specific person being substituted"
            />
            <div className="sm:col-span-2">
              <TextareaInput
                label="Narration"
                hint="Optional remarks, edge cases, or unexpected events during this overtime"
                value={form.narration}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, narration: e.target.value }))
                }
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Overtime
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("list");
              }}
              className="rounded-lg border border-corporate-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ModuleAddListTabBar
        moduleName="Overtime"
        active="list"
        onList={() => {
          resetForm();
          setView("list");
        }}
        onAdd={openAdd}
      />

      <div className="workspace-panel-stack">
        <aside className="space-y-2">
          {OVERTIME_LAYER_TABS.map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => setActiveLayer(layer)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                activeLayer === layer
                  ? "border-corporate-brand bg-corporate-brand/10 font-semibold text-corporate-brand"
                  : "border-corporate-border bg-corporate-surface text-corporate-text hover:bg-corporate-bg"
              )}
            >
              <span>{OVERTIME_PIPELINE_STAGE_LABELS[layer]}</span>
              <span className="rounded-full bg-corporate-bg px-2 py-0.5 text-xs font-bold">
                {layerCounts[layer] ?? 0}
              </span>
            </button>
          ))}
        </aside>

        <div className="space-y-5">
          <div className="rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
            <h2 className="text-lg font-semibold text-corporate-text">
              {OVERTIME_PIPELINE_STAGE_LABELS[activeLayer]}
            </h2>
            <p className="text-sm text-corporate-muted">
              Overtime entries sequence through Layer 2 review, Layer 3 verification, and Layer 4
              ledger commit before settlement.
            </p>
          </div>

          <UniversalMasterListShell
            moduleName="Overtime"
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          >
            <UniversalMasterListTable>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Employee</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Reason</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Department</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Paid Today</th>
                  <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                <OvertimeListBody
                  records={records}
                  activeLayer={activeLayer}
                  departmentDrafts={departmentDrafts}
                  departmentOptions={departmentSelectOptions}
                  approvalSelections={approvalSelections}
                  onLayerApproval={handleLayerApproval}
                  onSetPayslipId={setPayslipId}
                  onMarkAsPaid={markAsPaid}
                  onEdit={openEdit}
                  onDepartmentDraftChange={(id, value) =>
                    setDepartmentDrafts((prev) => ({ ...prev, [id]: value }))
                  }
                  onApprovalSelectionChange={(id, action) =>
                    setApprovalSelections((prev) => ({ ...prev, [id]: action }))
                  }
                />
              </tbody>
            </UniversalMasterListTable>
          </UniversalMasterListShell>
        </div>
      </div>
    </>
  );
}

type OvertimeListBodyProps = {
  records: OvertimeRecord[];
  activeLayer: OvertimePipelineStage;
  departmentDrafts: Record<string, string>;
  departmentOptions: { value: string; label: string }[];
  approvalSelections: Record<string, PipelineApprovalAction>;
  onLayerApproval: (record: OvertimeRecord, action: PipelineApprovalAction) => void;
  onSetPayslipId: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onEdit: (record: OvertimeRecord) => void;
  onDepartmentDraftChange: (id: string, value: string) => void;
  onApprovalSelectionChange: (id: string, action: PipelineApprovalAction) => void;
};

function OvertimeListBody({
  records,
  activeLayer,
  departmentDrafts,
  departmentOptions,
  approvalSelections,
  onLayerApproval,
  onSetPayslipId,
  onMarkAsPaid,
  onEdit,
  onDepartmentDraftChange,
  onApprovalSelectionChange,
}: OvertimeListBodyProps) {
  const { searchQuery, departmentFilter, designationFilter } = useMasterListFilters();
  const filteredRecords = useMemo(
    () =>
      records.filter(
        (row) =>
          row.pipelineStage === activeLayer &&
          (activeLayer !== OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED ||
            row.paymentStatus === "due") &&
          matchesUniversalNameSearch(
            searchQuery,
            row.employeeName,
            [
              row.workDate,
              row.assignedFromGroup,
              row.overtimeReason,
              row.shiftType,
              row.fromTime,
              row.toTime,
              row.workLocation,
              row.workLocationAssignment,
              row.assignedMachine,
              row.narration,
              String(row.amountPaidToday),
              String(row.totalHours),
            ],
            {
              departmentFilter,
              designationFilter,
              skipDepartmentIfAbsent: true,
              skipDesignationIfAbsent: true,
            }
          )
      ),
    [records, activeLayer, searchQuery, departmentFilter, designationFilter]
  );

  if (filteredRecords.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-10 text-center text-sm text-corporate-muted">
          <Clock className="mx-auto mb-2 h-6 w-6 opacity-60" />
          {searchQuery.trim()
            ? LIST_SEARCH_EMPTY_MESSAGE
            : `No records in ${OVERTIME_PIPELINE_STAGE_LABELS[activeLayer]}.`}
        </td>
      </tr>
    );
  }

  const approvalOptions = (stage: OvertimePipelineStage) => {
    if (stage === OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING) return LAYER_2_APPROVAL_OPTIONS;
    if (stage === OVERTIME_PIPELINE_STAGES.LAYER_3_WORKFLOW) return LAYER_3_APPROVAL_OPTIONS;
    return LAYER_4_APPROVAL_OPTIONS;
  };

  return (
    <>
      {filteredRecords.map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-3 text-sm font-medium">{row.employeeName}</td>
          <td className="px-4 py-3 text-sm">{row.workDate}</td>
          <td className="px-4 py-3 text-sm">{row.overtimeReason || "—"}</td>
          <td className="px-4 py-3 text-sm">{row.assignedMachine || "—"}</td>
          <td className="px-4 py-3 text-sm">
            ₹{row.amountPaidToday.toLocaleString("en-IN")}
          </td>
          <td className="px-4 py-3 text-right text-sm">
            <div className="inline-flex min-w-[220px] flex-col items-end gap-2">
              {activeLayer === OVERTIME_PIPELINE_STAGES.LAYER_2_STAGING && !row.assignedMachine && (
                <SelectInput
                  label=""
                  value={departmentDrafts[row.id] ?? row.assignedMachine}
                  placeholder="Select department"
                  options={departmentOptions}
                  onChange={(e) => onDepartmentDraftChange(row.id, e.target.value)}
                />
              )}
              <SelectInput
                label=""
                value={approvalSelections[row.id] ?? ""}
                options={approvalOptions(row.pipelineStage)}
                onChange={(e) => {
                  const action = e.target.value as PipelineApprovalAction;
                  onApprovalSelectionChange(row.id, action);
                  if (action) onLayerApproval(row, action);
                }}
              />
              {activeLayer === OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED && (
                <>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800 ring-2 ring-amber-300">
                    Status: DUE
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetPayslipId(row.id)}
                    className="rounded-full border border-corporate-border px-3 py-1 text-xs font-medium"
                  >
                    View Daily Payslip
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkAsPaid(row.id)}
                    className="rounded-full bg-corporate-brand px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Mark as Paid / Clear Settlement
                  </button>
                </>
              )}
              {activeLayer !== OVERTIME_PIPELINE_STAGES.LAYER_4_SAVED && (
                <ModuleListActionGroup
                  showView={false}
                  onEdit={() => onEdit(row)}
                  editLabel="Edit Draft"
                />
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
