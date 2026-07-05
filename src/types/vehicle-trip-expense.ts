import {
  applySalesStationKmMapping,
  calculateFinalTripSettlement,
  calculateFuelCost,
  calculateStationDistanceFreight,
  calculateTonnageFreight,
  resolveTonnageRate,
  type TonnageRateOption,
  type VehicleTripType,
} from "@/lib/vehicle-trip-calculator";

export type VehicleTripExpenseRecord = {
  id: string;
  tripDate: string;
  vehicleId: string;
  vehicleRegistration: string;
  averageMileageKmPerLiter: number;
  openingKm: number;
  closingKm: number;
  dieselPricePerLiter: number;
  fuelCost: number;
  tripType: VehicleTripType;
  totalTonnageLoaded: number;
  tonnageRateOption: TonnageRateOption;
  customTonnageRate: number;
  tonnageFreight: number;
  partyAccountId: string;
  partyStationName: string;
  partyDistanceKm: number;
  stationDistanceFreight: number;
  dailyFoodAllowance: number;
  finalSettlement: number;
  createdAt: string;
  updatedAt: string;
};

export type VehicleTripExpenseFormState = Omit<
  VehicleTripExpenseRecord,
  "id" | "fuelCost" | "tonnageFreight" | "stationDistanceFreight" | "finalSettlement" | "createdAt" | "updatedAt"
>;

export const EMPTY_VEHICLE_TRIP_FORM: VehicleTripExpenseFormState = {
  tripDate: new Date().toISOString().slice(0, 10),
  vehicleId: "",
  vehicleRegistration: "",
  averageMileageKmPerLiter: 0,
  openingKm: 0,
  closingKm: 0,
  dieselPricePerLiter: 0,
  tripType: "purchase",
  totalTonnageLoaded: 0,
  tonnageRateOption: "100",
  customTonnageRate: 0,
  partyAccountId: "",
  partyStationName: "",
  partyDistanceKm: 0,
  dailyFoodAllowance: 0,
};

export type ComputedTripAmounts = {
  fuelCost: number;
  tonnageFreight: number;
  stationDistanceFreight: number;
  finalSettlement: number;
};

export function computeTripAmounts(
  form: VehicleTripExpenseFormState
): ComputedTripAmounts {
  const fuelCost = calculateFuelCost(
    form.openingKm,
    form.closingKm,
    form.averageMileageKmPerLiter,
    form.dieselPricePerLiter
  );

  const tonnageFreight =
    form.tripType === "purchase"
      ? calculateTonnageFreight(
          form.totalTonnageLoaded,
          resolveTonnageRate(form.tonnageRateOption, form.customTonnageRate)
        )
      : 0;

  const stationDistanceFreight =
    form.tripType === "sales"
      ? calculateStationDistanceFreight(form.partyDistanceKm)
      : 0;

  const finalSettlement = calculateFinalTripSettlement(
    form.dailyFoodAllowance,
    fuelCost,
    tonnageFreight,
    stationDistanceFreight
  );

  return { fuelCost, tonnageFreight, stationDistanceFreight, finalSettlement };
}

export function normalizeVehicleTripExpenseRecord(
  row: Partial<VehicleTripExpenseRecord> & Pick<VehicleTripExpenseRecord, "id">
): VehicleTripExpenseRecord {
  const form: VehicleTripExpenseFormState = {
    tripDate: row.tripDate ?? new Date().toISOString().slice(0, 10),
    vehicleId: row.vehicleId ?? "",
    vehicleRegistration: row.vehicleRegistration ?? "",
    averageMileageKmPerLiter: Number(row.averageMileageKmPerLiter) || 0,
    openingKm: Number(row.openingKm) || 0,
    closingKm: Number(row.closingKm) || 0,
    dieselPricePerLiter: Number(row.dieselPricePerLiter) || 0,
    tripType: row.tripType === "sales" ? "sales" : "purchase",
    totalTonnageLoaded: Number(row.totalTonnageLoaded) || 0,
    tonnageRateOption: row.tonnageRateOption ?? "100",
    customTonnageRate: Number(row.customTonnageRate) || 0,
    partyAccountId: row.partyAccountId ?? "",
    partyStationName: row.partyStationName ?? "",
    partyDistanceKm: Number(row.partyDistanceKm) || 0,
    dailyFoodAllowance: Number(row.dailyFoodAllowance) || 0,
  };

  const computed = computeTripAmounts(form);

  return {
    id: row.id,
    ...form,
    fuelCost: row.fuelCost ?? computed.fuelCost,
    tonnageFreight: row.tonnageFreight ?? computed.tonnageFreight,
    stationDistanceFreight: row.stationDistanceFreight ?? computed.stationDistanceFreight,
    finalSettlement: row.finalSettlement ?? computed.finalSettlement,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateVehicleTripForm(form: VehicleTripExpenseFormState): string | null {
  if (!form.tripDate.trim()) return "Trip date is required.";
  if (!form.vehicleId) return "Vehicle selection is required.";
  if (form.averageMileageKmPerLiter <= 0) {
    return "Selected vehicle must have Average Mileage (KM per Liter) configured in Vehicles Master.";
  }
  if (form.dieselPricePerLiter <= 0) return "Today's diesel price per liter is required.";
  if (form.closingKm < form.openingKm) {
    return "Closing KM must be greater than or equal to Opening KM.";
  }
  if (form.tripType === "purchase" && form.totalTonnageLoaded <= 0) {
    return "Total tonnage loaded is required for purchase / inward trips.";
  }
  if (form.tripType === "sales" && !form.partyAccountId) {
    return "Party station / destination is required for sales / outward trips.";
  }
  return null;
}

export { applySalesStationKmMapping };
