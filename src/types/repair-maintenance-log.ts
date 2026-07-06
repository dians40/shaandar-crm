export type VehicleRepairType =
  | "Engine"
  | "Tyre"
  | "Electrical"
  | "Suspension"
  | "Other";

export type MachineRepairLogRow = {
  id: string;
  machineId: string;
  machineIdName: string;
  breakdownCause: string;
  workDone: string;
  sparesUsed: string;
  vendorMechanic: string;
  maintenanceCost: number;
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
  loggedAt: string;
  nextMaintenanceDate: string;
};

export type MachineRepairFormState = {
  machineId: string;
  breakdownCause: string;
  workDone: string;
  sparesUsed: string;
  vendorMechanic: string;
  maintenanceCost: string;
};

export type VehicleRepairFormState = {
  vehicleId: string;
  driverName: string;
  odometerKm: string;
  repairType: VehicleRepairType | "";
  workshopDetails: string;
  totalAmount: string;
};

export const EMPTY_MACHINE_REPAIR_FORM: MachineRepairFormState = {
  machineId: "",
  breakdownCause: "",
  workDone: "",
  sparesUsed: "",
  vendorMechanic: "",
  maintenanceCost: "",
};

export const EMPTY_VEHICLE_REPAIR_FORM: VehicleRepairFormState = {
  vehicleId: "",
  driverName: "",
  odometerKm: "",
  repairType: "",
  workshopDetails: "",
  totalAmount: "",
};

export const VEHICLE_REPAIR_TYPE_OPTIONS: VehicleRepairType[] = [
  "Engine",
  "Tyre",
  "Electrical",
  "Suspension",
  "Other",
];

export function validateMachineRepairForm(form: MachineRepairFormState): string | null {
  if (!form.machineId.trim()) return "Select a machine from the master list.";
  if (!form.breakdownCause.trim()) return "Breakdown cause is required.";
  if (!form.workDone.trim()) return "Detailed work done is required.";
  if (!form.vendorMechanic.trim()) return "Vendor / mechanic details are required.";
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
  const total = Number(form.totalAmount);
  if (!Number.isFinite(total) || total < 0) return "Enter a valid total amount.";
  return null;
}

function defaultNextMaintenanceDate(loggedAt?: string): string {
  const base = loggedAt ? new Date(loggedAt) : new Date();
  if (Number.isNaN(base.getTime())) {
    return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  base.setDate(base.getDate() + 90);
  return base.toISOString().slice(0, 10);
}

export function normalizeMachineRepairLogRow(
  row: Partial<MachineRepairLogRow> & Pick<MachineRepairLogRow, "id">
): MachineRepairLogRow {
  const machineIdName = row.machineIdName ?? row.machineId ?? "";
  return {
    id: row.id,
    machineId: row.machineId ?? machineIdName,
    machineIdName,
    breakdownCause: row.breakdownCause ?? "",
    workDone: row.workDone ?? "",
    sparesUsed: row.sparesUsed ?? "",
    vendorMechanic: row.vendorMechanic ?? "",
    maintenanceCost: Number(row.maintenanceCost) || 0,
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
    loggedAt: row.loggedAt ?? new Date().toISOString(),
    nextMaintenanceDate: row.nextMaintenanceDate ?? defaultNextMaintenanceDate(row.loggedAt),
  };
}
