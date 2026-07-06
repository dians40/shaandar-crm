export type VehicleRepairType =
  | "Engine"
  | "Tyre"
  | "Electrical"
  | "Suspension"
  | "Other";

export type MachineRepairLogRow = {
  id: string;
  machineIdName: string;
  breakdownCause: string;
  workDone: string;
  sparesUsed: string;
  vendorMechanic: string;
  maintenanceCost: number;
  loggedAt: string;
};

export type VehicleRepairLogRow = {
  id: string;
  vehicleNumber: string;
  driverName: string;
  odometerKm: number;
  repairType: VehicleRepairType;
  workshopDetails: string;
  totalAmount: number;
  loggedAt: string;
};

export type MachineRepairFormState = {
  machineIdName: string;
  breakdownCause: string;
  workDone: string;
  sparesUsed: string;
  vendorMechanic: string;
  maintenanceCost: string;
};

export type VehicleRepairFormState = {
  vehicleNumber: string;
  driverName: string;
  odometerKm: string;
  repairType: VehicleRepairType | "";
  workshopDetails: string;
  totalAmount: string;
};

export const EMPTY_MACHINE_REPAIR_FORM: MachineRepairFormState = {
  machineIdName: "",
  breakdownCause: "",
  workDone: "",
  sparesUsed: "",
  vendorMechanic: "",
  maintenanceCost: "",
};

export const EMPTY_VEHICLE_REPAIR_FORM: VehicleRepairFormState = {
  vehicleNumber: "",
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
  if (!form.machineIdName.trim()) return "Machine ID / Name is required.";
  if (!form.breakdownCause.trim()) return "Breakdown cause is required.";
  if (!form.workDone.trim()) return "Detailed work done is required.";
  if (!form.vendorMechanic.trim()) return "Vendor / mechanic details are required.";
  const cost = Number(form.maintenanceCost);
  if (!Number.isFinite(cost) || cost < 0) return "Enter a valid maintenance cost.";
  return null;
}

export function validateVehicleRepairForm(form: VehicleRepairFormState): string | null {
  if (!form.vehicleNumber.trim()) return "Vehicle number is required.";
  if (!form.driverName.trim()) return "Driver name is required.";
  const odometer = Number(form.odometerKm);
  if (!Number.isFinite(odometer) || odometer < 0) return "Enter a valid odometer reading (KM).";
  if (!form.repairType) return "Select a repair type.";
  if (!form.workshopDetails.trim()) return "Workshop details are required.";
  const total = Number(form.totalAmount);
  if (!Number.isFinite(total) || total < 0) return "Enter a valid total amount.";
  return null;
}
