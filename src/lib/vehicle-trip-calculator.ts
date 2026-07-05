export type VehicleTripType = "purchase" | "sales";

export type TonnageRateOption = "100" | "150" | "custom";

export const VEHICLE_TRIP_TYPE_OPTIONS: Array<{
  value: VehicleTripType;
  label: string;
}> = [
  { value: "purchase", label: "Purchase / Inward" },
  { value: "sales", label: "Sales / Outward" },
];

export const TONNAGE_RATE_OPTIONS: Array<{
  value: TonnageRateOption;
  label: string;
  rate: number;
}> = [
  { value: "100", label: "₹100 per Ton", rate: 100 },
  { value: "150", label: "₹150 per Ton", rate: 150 },
  { value: "custom", label: "Custom Rate", rate: 0 },
];

/** Default station-distance freight multiplier (₹ per KM) for sales trips. */
export const DEFAULT_STATION_FREIGHT_PER_KM = 35;

export function resolveTonnageRate(
  option: TonnageRateOption,
  customRate: number
): number {
  if (option === "custom") return Math.max(0, customRate);
  const preset = TONNAGE_RATE_OPTIONS.find((row) => row.value === option);
  return preset?.rate ?? 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateFuelCost(
  openingKm: number,
  closingKm: number,
  mileageKmPerLiter: number,
  dieselPricePerLiter: number
): number {
  if (mileageKmPerLiter <= 0 || dieselPricePerLiter <= 0) return 0;
  const distance = Math.max(0, closingKm - openingKm);
  const litersUsed = distance / mileageKmPerLiter;
  return round2(litersUsed * dieselPricePerLiter);
}

export function calculateTonnageFreight(
  totalTonnageLoaded: number,
  tonnageRate: number
): number {
  return round2(Math.max(0, totalTonnageLoaded) * Math.max(0, tonnageRate));
}

export function calculateStationDistanceFreight(
  distanceKm: number,
  ratePerKm: number = DEFAULT_STATION_FREIGHT_PER_KM
): number {
  return round2(Math.max(0, distanceKm) * Math.max(0, ratePerKm));
}

export function calculateFinalTripSettlement(
  dailyFoodAllowance: number,
  fuelCost: number,
  tonnageFreight: number,
  stationDistanceFreight: number
): number {
  return round2(
    Math.max(0, dailyFoodAllowance) +
      Math.max(0, fuelCost) +
      Math.max(0, tonnageFreight) +
      Math.max(0, stationDistanceFreight)
  );
}

export function applySalesStationKmMapping(
  openingKm: number,
  partyDistanceKm: number
): { openingKm: number; closingKm: number } {
  const opening = Math.max(0, openingKm);
  const distance = Math.max(0, partyDistanceKm);
  return {
    openingKm: opening,
    closingKm: round2(opening + distance),
  };
}

export function sumOnRouteExtraExpenses(
  expenses: Array<{ amount: number }>
): number {
  return round2(
    expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  );
}

/** Estimated cash advance at dispatch — fuel + food + applicable freight. */
export function calculateEstimatedCashAdvance(
  dailyFoodAllowance: number,
  fuelCost: number,
  tonnageFreight: number,
  stationDistanceFreight: number
): number {
  return calculateFinalTripSettlement(
    dailyFoodAllowance,
    fuelCost,
    tonnageFreight,
    stationDistanceFreight
  );
}

/** Net cash the driver must return after on-route spending. */
export function calculateNetDueCashBalance(
  cashAdvanceGiven: number,
  fuelCost: number,
  dailyFoodAllowance: number,
  extraExpensesTotal: number
): number {
  return round2(
    Math.max(0, cashAdvanceGiven) -
      (Math.max(0, fuelCost) + Math.max(0, dailyFoodAllowance) + Math.max(0, extraExpensesTotal))
  );
}
