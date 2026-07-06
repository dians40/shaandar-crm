export type VehicleRepairType =
  | "Engine"
  | "Tyre"
  | "Electrical"
  | "Suspension"
  | "Other";

export type PreventiveMaintenanceCycle = "half-yearly" | "yearly";

export type MachineRepairLogRow = {
  id: string;
  machineId: string;
  machineIdName: string;
  breakdownCause: string;
  breakdownRootCause: string;
  productAllocation: string;
  diagnosisStatus: string;
  breakdownNotes: string;
  workDone: string;
  sparesUsed: string;
  vendorMechanic: string;
  maintenanceCost: number;
  preventiveCycle: PreventiveMaintenanceCycle;
  loggedAt: string;
  nextMaintenanceDate: string;
};

export type VehicleRepairLogRow = {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  driverName: string;
  odometerKm: number;
  repairType: VehicleRepairType;
  workshopDetails: string;
  totalAmount: number;
  preventiveCycle: PreventiveMaintenanceCycle;
  loggedAt: string;
  nextMaintenanceDate: string;
};

export type MachineRepairFormState = {
  machineId: string;
  breakdownRootCause: string;
  productAllocation: string;
  diagnosisStatus: string;
  breakdownNotes: string;
  workDone: string;
  sparesUsed: string;
  vendorMechanic: string;
  maintenanceCost: string;
  preventiveCycle: PreventiveMaintenanceCycle | "";
};

export type VehicleRepairFormState = {
  vehicleId: string;
  driverName: string;
  odometerKm: string;
  repairType: VehicleRepairType | "";
  workshopDetails: string;
  totalAmount: string;
  preventiveCycle: PreventiveMaintenanceCycle | "";
};

export const EMPTY_MACHINE_REPAIR_FORM: MachineRepairFormState = {
  machineId: "",
  breakdownRootCause: "",
  productAllocation: "",
  diagnosisStatus: "",
  breakdownNotes: "",
  workDone: "",
  sparesUsed: "",
  vendorMechanic: "",
  maintenanceCost: "",
  preventiveCycle: "half-yearly",
};

export const EMPTY_VEHICLE_REPAIR_FORM: VehicleRepairFormState = {
  vehicleId: "",
  driverName: "",
  odometerKm: "",
  repairType: "",
  workshopDetails: "",
  totalAmount: "",
  preventiveCycle: "half-yearly",
};

export const VEHICLE_REPAIR_TYPE_OPTIONS: VehicleRepairType[] = [
  "Engine",
  "Tyre",
  "Electrical",
  "Suspension",
  "Other",
];

export const PREVENTIVE_CYCLE_OPTIONS: {
  value: PreventiveMaintenanceCycle;
  label: string;
  months: number;
}[] = [
  { value: "half-yearly", label: "Half-Yearly (6 Months)", months: 6 },
  { value: "yearly", label: "Yearly (12 Months)", months: 12 },
];

export const BREAKDOWN_ROOT_CAUSE_OPTIONS = [
  "Wear and Tear",
  "Electrical Fault",
  "Mechanical Failure",
  "Operator Error",
  "Power Supply Issue",
  "Lubrication Failure",
  "Overloading",
  "Sensor Malfunction",
  "Belt or Chain Failure",
  "Other",
] as const;

export const BREAKDOWN_DIAGNOSIS_STATUS_OPTIONS = [
  "Identified — Pending Repair",
  "Under Diagnosis",
  "Root Cause Confirmed",
  "Awaiting Spares",
  "Repair In Progress",
  "Resolved — Testing",
  "Closed",
] as const;

export const DEFAULT_PRODUCT_ALLOCATION_OPTIONS = [
  "No Product Assigned",
  "Mixed Production Run",
  "Raw Material Only",
  "Finished Goods Queue",
  "Maintenance Hold — No Production",
] as const;

export function formatBreakdownCauseSummary(
  rootCause: string,
  productAllocation: string,
  diagnosisStatus: string,
  notes = ""
): string {
  const parts = [rootCause, productAllocation, diagnosisStatus, notes.trim()]
    .filter(Boolean)
    .join(" · ");
  return parts || "Breakdown logged";
}

export function validateMachineRepairForm(form: MachineRepairFormState): string | null {
  if (!form.machineId.trim()) return "Select an active machine from the master list.";
  if (!form.breakdownRootCause.trim()) return "Select a breakdown root cause.";
  if (!form.productAllocation.trim()) return "Select the product or machine allocation.";
  if (!form.diagnosisStatus.trim()) return "Select a problem identification / diagnosis status.";
  if (!form.workDone.trim()) return "Detailed work done is required.";
  if (!form.vendorMechanic.trim()) return "Vendor / mechanic details are required.";
  if (!form.preventiveCycle) return "Select a preventive maintenance cycle.";
  const cost = Number(form.maintenanceCost);
  if (!Number.isFinite(cost) || cost < 0) return "Enter a valid maintenance cost.";
  return null;
}

export function validateVehicleRepairForm(form: VehicleRepairFormState): string | null {
  if (!form.vehicleId.trim()) return "Select a vehicle from the master list.";
  if (!form.driverName.trim()) return "Driver name is required.";
  const odometer = Number(form.odometerKm);
  if (!Number.isFinite(odometer) || odometer < 0) return "Enter a valid odometer reading (KM).";
  if (!form.repairType) return "Select a repair type.";
  if (!form.workshopDetails.trim()) return "Workshop details are required.";
  if (!form.preventiveCycle) return "Select a preventive maintenance cycle.";
  const total = Number(form.totalAmount);
  if (!Number.isFinite(total) || total < 0) return "Enter a valid total amount.";
  return null;
}

function defaultNextMaintenanceDate(loggedAt?: string): string {
  const base = loggedAt ? new Date(loggedAt) : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 6);
    return fallback.toISOString().slice(0, 10);
  }
  base.setMonth(base.getMonth() + 6);
  return base.toISOString().slice(0, 10);
}

export function normalizeMachineRepairLogRow(
  row: Partial<MachineRepairLogRow> & Pick<MachineRepairLogRow, "id">
): MachineRepairLogRow {
  const machineIdName = row.machineIdName ?? row.machineId ?? "";
  const breakdownRootCause = row.breakdownRootCause ?? row.breakdownCause ?? "";
  const productAllocation = row.productAllocation ?? "";
  const diagnosisStatus = row.diagnosisStatus ?? "";
  const breakdownNotes = row.breakdownNotes ?? "";

  return {
    id: row.id,
    machineId: row.machineId ?? machineIdName,
    machineIdName,
    breakdownRootCause,
    productAllocation,
    diagnosisStatus,
    breakdownNotes,
    breakdownCause:
      row.breakdownCause ??
      formatBreakdownCauseSummary(
        breakdownRootCause,
        productAllocation,
        diagnosisStatus,
        breakdownNotes
      ),
    workDone: row.workDone ?? "",
    sparesUsed: row.sparesUsed ?? "",
    vendorMechanic: row.vendorMechanic ?? "",
    maintenanceCost: Number(row.maintenanceCost) || 0,
    preventiveCycle: row.preventiveCycle ?? "half-yearly",
    loggedAt: row.loggedAt ?? new Date().toISOString(),
    nextMaintenanceDate: row.nextMaintenanceDate ?? defaultNextMaintenanceDate(row.loggedAt),
  };
}

export function normalizeVehicleRepairLogRow(
  row: Partial<VehicleRepairLogRow> & Pick<VehicleRepairLogRow, "id">
): VehicleRepairLogRow {
  const vehicleNumber = row.vehicleNumber ?? "";
  return {
    id: row.id,
    vehicleId: row.vehicleId ?? vehicleNumber,
    vehicleNumber,
    driverName: row.driverName ?? "",
    odometerKm: Number(row.odometerKm) || 0,
    repairType: row.repairType ?? "Other",
    workshopDetails: row.workshopDetails ?? "",
    totalAmount: Number(row.totalAmount) || 0,
    preventiveCycle: row.preventiveCycle ?? "half-yearly",
    loggedAt: row.loggedAt ?? new Date().toISOString(),
    nextMaintenanceDate: row.nextMaintenanceDate ?? defaultNextMaintenanceDate(row.loggedAt),
  };
}
