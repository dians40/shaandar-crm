"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Hammer, Plus, Save, Wrench } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { useItems } from "@/hooks/use-items";
import { useVehiclesMaster } from "@/hooks/use-vehicles-master";
import {
  collectDashboardMaintenanceAlerts,
  computeNextMaintenanceDateFromCycle,
  formatMaintenanceAlertLabel,
  PREVENTIVE_ALERT_MAX_DAYS,
  PREVENTIVE_ALERT_MIN_DAYS,
  resolveMaintenanceAlertStatus,
} from "@/lib/repair-maintenance-alerts";
import {
  appendMachineRepairLog,
  appendVehicleRepairLog,
  readMachineRepairLogs,
  readVehicleRepairLogs,
} from "@/lib/repair-maintenance-store";
import { cn } from "@/lib/utils";
import {
  BREAKDOWN_DIAGNOSIS_STATUS_OPTIONS,
  BREAKDOWN_ROOT_CAUSE_OPTIONS,
  calculateWorkDurationDays,
  DEFAULT_PRODUCT_ALLOCATION_OPTIONS,
  DEFAULT_SPARE_PART_OPTIONS,
  EMPTY_MACHINE_REPAIR_FORM,
  EMPTY_VEHICLE_REPAIR_FORM,
  formatBreakdownCauseSummary,
  formatPreventiveCycleLabel,
  formatSparesUsedLabel,
  parseOptionalMaintenanceCost,
  PREVENTIVE_CYCLE_OPTIONS,
  VEHICLE_REPAIR_TYPE_OPTIONS,
  validateMachineRepairForm,
  validateVehicleRepairForm,
  type MachineRepairFormState,
  type MachineRepairLogRow,
  type PreventiveMaintenanceCycle,
  type VehicleRepairFormState,
  type VehicleRepairLogRow,
} from "@/types/repair-maintenance-log";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type EngineSectionProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentClass: string;
  children: React.ReactNode;
};

function EngineSection({ title, subtitle, icon, accentClass, children }: EngineSectionProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-corporate-border/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <header
        className={`flex items-start gap-3 border-b border-corporate-border/70 px-5 py-4 ${accentClass}`}
      >
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-corporate-text">{title}</h3>
          <p className="mt-0.5 text-sm text-corporate-muted">{subtitle}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </article>
  );
}

function MaintenanceAlertBadge({
  nextMaintenanceDate,
  preventiveCycle,
}: {
  nextMaintenanceDate: string;
  preventiveCycle: PreventiveMaintenanceCycle;
}) {
  const alertStatus = resolveMaintenanceAlertStatus(nextMaintenanceDate, preventiveCycle);
  if (!alertStatus?.isUpcomingAlert) {
    return (
      <span className="text-xs text-corporate-muted">
        Next service: {formatDateLabel(nextMaintenanceDate)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900 shadow-sm">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      [{formatMaintenanceAlertLabel(alertStatus.daysUntilDue, preventiveCycle)}]
    </span>
  );
}

export default function RepairMaintenancePanel() {
  const { machineOptions, isReady: machinesReady } = useGeneralSettings();
  const { items, isReady: itemsReady } = useItems();
  const { vehicles, isReady: vehiclesReady } = useVehiclesMaster();

  const [machineLogs, setMachineLogs] = useState<MachineRepairLogRow[]>([]);
  const [vehicleLogs, setVehicleLogs] = useState<VehicleRepairLogRow[]>([]);
  const [machineForm, setMachineForm] = useState<MachineRepairFormState>(EMPTY_MACHINE_REPAIR_FORM);
  const [vehicleForm, setVehicleForm] = useState<VehicleRepairFormState>(EMPTY_VEHICLE_REPAIR_FORM);
  const [machineError, setMachineError] = useState<string | null>(null);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [machineSuccess, setMachineSuccess] = useState<string | null>(null);
  const [vehicleSuccess, setVehicleSuccess] = useState<string | null>(null);
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const activeMachineOptions = useMemo(
    () => machineOptions.filter((option) => option.value.trim().length > 0),
    [machineOptions]
  );

  const activeVehicleOptions = useMemo(
    () =>
      vehicles
        .filter((vehicle) => vehicle.registrationNumber.trim().length > 0)
        .map((vehicle) => ({
          value: vehicle.id,
          label: `${vehicle.registrationNumber}${vehicle.model ? ` — ${vehicle.model}` : ""}`,
        })),
    [vehicles]
  );

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const productAllocationOptions = useMemo(() => {
    const itemLabels = items
      .map((item) => item.itemName.trim())
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
    const defaults = DEFAULT_PRODUCT_ALLOCATION_OPTIONS.map((option) => ({
      value: option,
      label: option,
    }));
    const machineProducts = activeMachineOptions.map((option) => ({
      value: `Production on ${option.label}`,
      label: `Production on ${option.label}`,
    }));
    return [...defaults, ...machineProducts, ...itemLabels];
  }, [activeMachineOptions, items]);

  const dashboardAlerts = useMemo(
    () => collectDashboardMaintenanceAlerts(machineLogs, vehicleLogs),
    [machineLogs, vehicleLogs]
  );

  const sparePartOptions = useMemo(() => {
    const itemParts = items
      .map((item) => item.itemName.trim())
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
    const defaults = DEFAULT_SPARE_PART_OPTIONS.map((option) => ({
      value: option,
      label: option,
    }));
    return [...defaults, ...itemParts];
  }, [items]);

  const calculatedDaysTaken = useMemo(
    () => calculateWorkDurationDays(machineForm.workStartDate, machineForm.workDoneDate),
    [machineForm.workStartDate, machineForm.workDoneDate]
  );

  const upcomingMachineAlerts = useMemo(
    () =>
      machineLogs.filter(
        (row) =>
          resolveMaintenanceAlertStatus(row.nextMaintenanceDate, row.preventiveCycle)
            ?.isUpcomingAlert
      ).length,
    [machineLogs]
  );

  const upcomingVehicleAlerts = useMemo(
    () =>
      vehicleLogs.filter(
        (row) =>
          resolveMaintenanceAlertStatus(row.nextMaintenanceDate, row.preventiveCycle)
            ?.isUpcomingAlert
      ).length,
    [vehicleLogs]
  );

  useEffect(() => {
    setMachineLogs(readMachineRepairLogs());
    setVehicleLogs(readVehicleRepairLogs());
  }, []);

  const machineTotalCost = useMemo(
    () => machineLogs.reduce((sum, row) => sum + row.maintenanceCost, 0),
    [machineLogs]
  );

  const vehicleTotalCost = useMemo(
    () => vehicleLogs.reduce((sum, row) => sum + row.totalAmount, 0),
    [vehicleLogs]
  );

  const handleMachineField = useCallback(
    (field: keyof MachineRepairFormState, value: string) => {
      setMachineForm((prev) => ({ ...prev, [field]: value }));
      setMachineError(null);
      setMachineSuccess(null);
    },
    []
  );

  const handleVehicleField = useCallback(
    (field: keyof VehicleRepairFormState, value: string) => {
      setVehicleForm((prev) => ({ ...prev, [field]: value }));
      setVehicleError(null);
      setVehicleSuccess(null);
    },
    []
  );

  const handleVehicleSelect = useCallback(
    (vehicleId: string) => {
      const vehicle = vehicleById.get(vehicleId);
      setVehicleForm((prev) => ({
        ...prev,
        vehicleId,
        driverName: vehicle?.driverName?.trim() || prev.driverName,
      }));
      setVehicleError(null);
      setVehicleSuccess(null);
    },
    [vehicleById]
  );

  const submitMachineLog = () => {
    const validationError = validateMachineRepairForm(machineForm);
    if (validationError) {
      setMachineError(validationError);
      setMachineSuccess(null);
      return;
    }

    const machineName =
      activeMachineOptions.find((option) => option.value === machineForm.machineId)?.label ??
      machineForm.machineId;
    const loggedAt = new Date().toISOString();
    const cycle = machineForm.preventiveCycle as PreventiveMaintenanceCycle;
    const anchorDate = machineForm.workDoneDate || loggedAt.slice(0, 10);
    const nextMaintenanceDate = computeNextMaintenanceDateFromCycle(anchorDate, cycle);
    const daysTaken = calculateWorkDurationDays(
      machineForm.workStartDate,
      machineForm.workDoneDate
    );
    const breakdownCause = formatBreakdownCauseSummary(
      machineForm.breakdownRootCause.trim(),
      machineForm.productAllocation.trim(),
      machineForm.diagnosisStatus.trim(),
      machineForm.breakdownNotes.trim()
    );

    const row: MachineRepairLogRow = {
      id: createId("machine"),
      machineId: machineForm.machineId,
      machineIdName: machineName,
      breakdownRootCause: machineForm.breakdownRootCause.trim(),
      productAllocation: machineForm.productAllocation.trim(),
      diagnosisStatus: machineForm.diagnosisStatus.trim(),
      breakdownNotes: machineForm.breakdownNotes.trim(),
      breakdownCause,
      workStartDate: machineForm.workStartDate,
      workDoneDate: machineForm.workDoneDate,
      daysTaken,
      workDone: machineForm.workDone.trim(),
      sparePartSelection: machineForm.sparePartSelection.trim(),
      sparesUsed: formatSparesUsedLabel(
        machineForm.sparePartSelection,
        machineForm.sparesUsed
      ),
      vendorMechanic: machineForm.vendorMechanic.trim(),
      maintenanceCost: parseOptionalMaintenanceCost(machineForm.maintenanceCost),
      preventiveCycle: cycle,
      loggedAt,
      nextMaintenanceDate,
    };

    const next = appendMachineRepairLog(row);
    setMachineLogs(next);
    setMachineForm(EMPTY_MACHINE_REPAIR_FORM);
    setShowMachineForm(false);
    setMachineError(null);
    setMachineSuccess("Machine repair log saved under Repair & Maintenance.");
  };

  const submitVehicleLog = () => {
    const validationError = validateVehicleRepairForm(vehicleForm);
    if (validationError) {
      setVehicleError(validationError);
      setVehicleSuccess(null);
      return;
    }

    const vehicle = vehicleById.get(vehicleForm.vehicleId);
    const vehicleNumber = vehicle?.registrationNumber ?? vehicleForm.vehicleId;
    const loggedAt = new Date().toISOString();
    const cycle = vehicleForm.preventiveCycle as PreventiveMaintenanceCycle;
    const nextMaintenanceDate = computeNextMaintenanceDateFromCycle(loggedAt, cycle);

    const row: VehicleRepairLogRow = {
      id: createId("vehicle"),
      vehicleId: vehicleForm.vehicleId,
      vehicleNumber,
      driverName: vehicleForm.driverName.trim(),
      odometerKm: Number(vehicleForm.odometerKm),
      repairType: vehicleForm.repairType as VehicleRepairLogRow["repairType"],
      workshopDetails: vehicleForm.workshopDetails.trim(),
      totalAmount: Number(vehicleForm.totalAmount),
      preventiveCycle: cycle,
      loggedAt,
      nextMaintenanceDate,
    };

    const next = appendVehicleRepairLog(row);
    setVehicleLogs(next);
    setVehicleForm(EMPTY_VEHICLE_REPAIR_FORM);
    setShowVehicleForm(false);
    setVehicleError(null);
    setVehicleSuccess("Vehicle repair log saved under Repair & Maintenance.");
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-2xl border border-corporate-border/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-5 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-corporate-muted">
          Repair & Maintenance
        </p>
        <h3 className="mt-1 text-lg font-semibold text-corporate-text">
          Operational Repair Logging Workspace
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-corporate-muted">
          Record machine and vehicle repair events with master-linked selections, structured
          breakdown call tracking, and proactive preventive maintenance alerts {PREVENTIVE_ALERT_MIN_DAYS}
          –{PREVENTIVE_ALERT_MAX_DAYS} days before service is due.
        </p>
        {dashboardAlerts.length > 0 && (
          <div
            className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 shadow-md"
            role="alert"
          >
            <div className="flex flex-wrap items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-950">
                  Preventive Maintenance Alert — {dashboardAlerts.length} asset
                  {dashboardAlerts.length === 1 ? "" : "s"} due within{" "}
                  {PREVENTIVE_ALERT_MIN_DAYS}–{PREVENTIVE_ALERT_MAX_DAYS} days
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-900">
                  {dashboardAlerts.slice(0, 5).map((alert) => (
                    <li key={alert.id}>
                      {alert.assetType === "machine" ? "Machine" : "Vehicle"}:{" "}
                      <span className="font-semibold">{alert.assetLabel}</span> — service on{" "}
                      {formatDateLabel(alert.nextMaintenanceDate)} (
                      {formatMaintenanceAlertLabel(alert.daysUntilDue, alert.preventiveCycle)})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
            <span className="text-corporate-muted">Machine spend: </span>
            <span className="font-semibold text-emerald-800">{formatCurrency(machineTotalCost)}</span>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm">
            <span className="text-corporate-muted">Vehicle spend: </span>
            <span className="font-semibold text-sky-800">{formatCurrency(vehicleTotalCost)}</span>
          </div>
          <div className="rounded-xl border border-corporate-border bg-white px-4 py-2 text-sm shadow-sm">
            <span className="text-corporate-muted">Combined total: </span>
            <span className="font-semibold text-corporate-text">
              {formatCurrency(machineTotalCost + vehicleTotalCost)}
            </span>
          </div>
          {(upcomingMachineAlerts > 0 || upcomingVehicleAlerts > 0) && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {upcomingMachineAlerts + upcomingVehicleAlerts} upcoming maintenance alert
              {upcomingMachineAlerts + upcomingVehicleAlerts === 1 ? "" : "s"} (
              {PREVENTIVE_ALERT_MIN_DAYS}–{PREVENTIVE_ALERT_MAX_DAYS} day window)
            </div>
          )}
        </div>
      </div>

      <EngineSection
        title="Machine Repair & Maintenance Engine"
        subtitle="Track breakdowns, corrective work, spares consumption, and vendor billing."
        icon={<Wrench className="h-5 w-5 text-amber-700" aria-hidden />}
        accentClass="bg-gradient-to-r from-amber-50/90 to-orange-50/40"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-corporate-muted">
            {machineLogs.length} machine repair record{machineLogs.length === 1 ? "" : "s"} logged
          </p>
          <button
            type="button"
            onClick={() => {
              setShowMachineForm((prev) => !prev);
              setMachineError(null);
              setMachineSuccess(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Row
          </button>
        </div>

        {machineSuccess && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {machineSuccess}
          </p>
        )}

        {showMachineForm && (
          <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 shadow-inner">
            <h4 className="mb-3 text-sm font-semibold text-corporate-text">New Machine Repair Entry</h4>
            <p className="mb-3 text-xs text-corporate-muted">
              Breakdown Calls — capture root cause, product allocation, and diagnosis status.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SelectInput
                label="Machine Selection"
                required
                value={machineForm.machineId}
                onChange={(event) => handleMachineField("machineId", event.target.value)}
                placeholder={machinesReady ? "Select active machine" : "Loading machines..."}
                options={activeMachineOptions}
              />
              <SelectInput
                label="Breakdown Root Cause"
                required
                value={machineForm.breakdownRootCause}
                onChange={(event) => handleMachineField("breakdownRootCause", event.target.value)}
                placeholder="Select root cause"
                options={BREAKDOWN_ROOT_CAUSE_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
              <SelectInput
                label="Product / Machine Allocation"
                required
                value={machineForm.productAllocation}
                onChange={(event) => handleMachineField("productAllocation", event.target.value)}
                placeholder={itemsReady ? "Select product allocation" : "Loading products..."}
                options={productAllocationOptions}
              />
              <SelectInput
                label="Problem Identification / Diagnosis Status"
                required
                value={machineForm.diagnosisStatus}
                onChange={(event) => handleMachineField("diagnosisStatus", event.target.value)}
                placeholder="Select diagnosis status"
                options={BREAKDOWN_DIAGNOSIS_STATUS_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
              <SelectInput
                label="Preventive Maintenance Cycle"
                required
                value={machineForm.preventiveCycle}
                onChange={(event) => handleMachineField("preventiveCycle", event.target.value)}
                placeholder="Select service cycle"
                options={PREVENTIVE_CYCLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
              <TextInput
                label="Breakdown Support Notes"
                value={machineForm.breakdownNotes}
                onChange={(e) => handleMachineField("breakdownNotes", e.target.value)}
                placeholder="Optional additional context"
              />
              <TextInput
                label="Work Start Date"
                required
                type="date"
                value={machineForm.workStartDate}
                onChange={(e) => handleMachineField("workStartDate", e.target.value)}
              />
              <TextInput
                label="Work Done Date"
                required
                type="date"
                value={machineForm.workDoneDate}
                onChange={(e) => handleMachineField("workDoneDate", e.target.value)}
              />
              <TextInput
                label="Days Taken"
                readOnly
                value={String(calculatedDaysTaken)}
                placeholder="Auto-calculated duration"
              />
              <SelectInput
                label="Spare Part Selection"
                value={machineForm.sparePartSelection}
                onChange={(event) =>
                  handleMachineField("sparePartSelection", event.target.value)
                }
                placeholder={itemsReady ? "Select spare part" : "Loading spare parts..."}
                options={sparePartOptions}
              />
              <TextInput
                label="Spares Used — Additional Notes"
                value={machineForm.sparesUsed}
                onChange={(e) => handleMachineField("sparesUsed", e.target.value)}
                placeholder="Quantity, batch, or usage notes"
              />
              <TextInput
                label="Vendor / Mechanic Details"
                required
                value={machineForm.vendorMechanic}
                onChange={(e) => handleMachineField("vendorMechanic", e.target.value)}
              />
              <TextInput
                label="Maintenance Cost (Optional)"
                type="number"
                min={0}
                step="0.01"
                value={machineForm.maintenanceCost}
                onChange={(e) => handleMachineField("maintenanceCost", e.target.value)}
                placeholder="Leave blank for zero"
              />
              <div className="md:col-span-2 xl:col-span-3">
                <TextareaInput
                  label="Detailed Work Done"
                  required
                  rows={3}
                  value={machineForm.workDone}
                  onChange={(e) => handleMachineField("workDone", e.target.value)}
                />
              </div>
            </div>
            {machineError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {machineError}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submitMachineLog}
                className="inline-flex items-center gap-2 rounded-lg bg-corporate-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
              >
                <Save className="h-4 w-4" aria-hidden />
                Save Log
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMachineForm(false);
                  setMachineForm(EMPTY_MACHINE_REPAIR_FORM);
                  setMachineError(null);
                }}
                className="rounded-lg border border-corporate-border bg-white px-4 py-2 text-sm font-medium text-corporate-text hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-corporate-border/80 shadow-sm">
          <table className="min-w-full divide-y divide-corporate-border/70 text-sm">
            <thead className="bg-slate-50/90">
              <tr>
                {[
                  "Machine",
                  "Root Cause",
                  "Work Start",
                  "Work Done",
                  "Days Taken",
                  "Spares Used",
                  "Cost",
                  "Service Cycle",
                  "Next Service",
                  "Preventive Alert",
                  "Logged At",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border/60 bg-white">
              {machineLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-corporate-muted">
                    No machine repair logs yet. Use Add Row to create the first entry.
                  </td>
                </tr>
              ) : (
                machineLogs.map((row) => {
                  const alertStatus = resolveMaintenanceAlertStatus(
                    row.nextMaintenanceDate,
                    row.preventiveCycle
                  );
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-slate-50/70",
                        alertStatus?.isUpcomingAlert && "bg-amber-50/40"
                      )}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-corporate-text">
                        {row.machineIdName}
                      </td>
                      <td className="max-w-[140px] px-3 py-2.5 text-corporate-text">
                        {row.breakdownRootCause || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-text">
                        {row.workStartDate ? formatDateLabel(row.workStartDate) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-text">
                        {row.workDoneDate ? formatDateLabel(row.workDoneDate) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-corporate-text">
                        {row.daysTaken} day{row.daysTaken === 1 ? "" : "s"}
                      </td>
                      <td className="max-w-[180px] px-3 py-2.5 text-corporate-muted">
                        {row.sparesUsed || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-emerald-700">
                        {row.maintenanceCost > 0 ? formatCurrency(row.maintenanceCost) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-corporate-text">
                        {formatPreventiveCycleLabel(row.preventiveCycle)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-text">
                        {formatDateLabel(row.nextMaintenanceDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <MaintenanceAlertBadge
                          nextMaintenanceDate={row.nextMaintenanceDate}
                          preventiveCycle={row.preventiveCycle}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-muted">
                        {formatTimestamp(row.loggedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </EngineSection>

      <EngineSection
        title="Vehicle Repair & Maintenance Engine"
        subtitle="Capture workshop visits, odometer readings, repair classification, and billing."
        icon={<Hammer className="h-5 w-5 text-sky-700" aria-hidden />}
        accentClass="bg-gradient-to-r from-sky-50/90 to-blue-50/40"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-corporate-muted">
            {vehicleLogs.length} vehicle repair record{vehicleLogs.length === 1 ? "" : "s"} logged
          </p>
          <button
            type="button"
            onClick={() => {
              setShowVehicleForm((prev) => !prev);
              setVehicleError(null);
              setVehicleSuccess(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Row
          </button>
        </div>

        {vehicleSuccess && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {vehicleSuccess}
          </p>
        )}

        {showVehicleForm && (
          <div className="mb-5 rounded-xl border border-sky-200/80 bg-sky-50/30 p-4 shadow-inner">
            <h4 className="mb-3 text-sm font-semibold text-corporate-text">New Vehicle Repair Entry</h4>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SelectInput
                label="Vehicle Selection"
                required
                value={vehicleForm.vehicleId}
                onChange={(event) => handleVehicleSelect(event.target.value)}
                placeholder={vehiclesReady ? "Select vehicle from master" : "Loading vehicles..."}
                options={activeVehicleOptions}
              />
              <TextInput
                label="Driver Name"
                required
                value={vehicleForm.driverName}
                onChange={(e) => handleVehicleField("driverName", e.target.value)}
              />
              <TextInput
                label="Current Odometer (KM)"
                required
                type="number"
                min={0}
                step="1"
                value={vehicleForm.odometerKm}
                onChange={(e) => handleVehicleField("odometerKm", e.target.value)}
              />
              <SelectInput
                label="Type of Repair"
                required
                value={vehicleForm.repairType}
                onChange={(e) => handleVehicleField("repairType", e.target.value)}
                placeholder="Select repair type"
                options={VEHICLE_REPAIR_TYPE_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
              <SelectInput
                label="Preventive Maintenance Cycle"
                required
                value={vehicleForm.preventiveCycle}
                onChange={(event) => handleVehicleField("preventiveCycle", event.target.value)}
                placeholder="Select service cycle"
                options={PREVENTIVE_CYCLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
              <TextInput
                label="Total Amount"
                required
                type="number"
                min={0}
                step="0.01"
                value={vehicleForm.totalAmount}
                onChange={(e) => handleVehicleField("totalAmount", e.target.value)}
              />
              <div className="md:col-span-2 xl:col-span-3">
                <TextareaInput
                  label="Workshop Details"
                  required
                  rows={3}
                  value={vehicleForm.workshopDetails}
                  onChange={(e) => handleVehicleField("workshopDetails", e.target.value)}
                />
              </div>
            </div>
            {vehicleError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {vehicleError}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submitVehicleLog}
                className="inline-flex items-center gap-2 rounded-lg bg-corporate-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
              >
                <Save className="h-4 w-4" aria-hidden />
                Save Log
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVehicleForm(false);
                  setVehicleForm(EMPTY_VEHICLE_REPAIR_FORM);
                  setVehicleError(null);
                }}
                className="rounded-lg border border-corporate-border bg-white px-4 py-2 text-sm font-medium text-corporate-text hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-corporate-border/80 shadow-sm">
          <table className="min-w-full divide-y divide-corporate-border/70 text-sm">
            <thead className="bg-slate-50/90">
              <tr>
                {[
                  "Vehicle Number",
                  "Driver Name",
                  "Odometer (KM)",
                  "Repair Type",
                  "Workshop Details",
                  "Total Amount",
                  "Service Cycle",
                  "Next Service",
                  "Preventive Alert",
                  "Logged At",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-corporate-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border/60 bg-white">
              {vehicleLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-corporate-muted">
                    No vehicle repair logs yet. Use Add Row to create the first entry.
                  </td>
                </tr>
              ) : (
                vehicleLogs.map((row) => {
                  const alertStatus = resolveMaintenanceAlertStatus(
                    row.nextMaintenanceDate,
                    row.preventiveCycle
                  );
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-slate-50/70",
                        alertStatus?.isUpcomingAlert && "bg-amber-50/40"
                      )}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-corporate-text">
                        {row.vehicleNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-text">{row.driverName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-text">
                        {row.odometerKm.toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                          {row.repairType}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5 text-corporate-muted">{row.workshopDetails}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-sky-700">
                        {formatCurrency(row.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-corporate-text">
                        {formatPreventiveCycleLabel(row.preventiveCycle)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-text">
                        {formatDateLabel(row.nextMaintenanceDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <MaintenanceAlertBadge
                          nextMaintenanceDate={row.nextMaintenanceDate}
                          preventiveCycle={row.preventiveCycle}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-corporate-muted">
                        {formatTimestamp(row.loggedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </EngineSection>
    </div>
  );
}
