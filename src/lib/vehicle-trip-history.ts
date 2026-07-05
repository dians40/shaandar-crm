import type { VehicleTripExpenseRecord } from "@/types/vehicle-trip-expense";

export type PreviousTripHistorySummary = {
  tripDate: string;
  fuelCost: number;
  freight: number;
  food: number;
};

export function resolveTripFreight(record: VehicleTripExpenseRecord): number {
  return record.tripType === "purchase"
    ? record.tonnageFreight
    : record.stationDistanceFreight;
}

/** Find the most recent prior trip matching vehicle + trip type + route/station. */
export function findPreviousMatchingTrip(
  records: VehicleTripExpenseRecord[],
  criteria: {
    vehicleId: string;
    tripType: VehicleTripExpenseRecord["tripType"];
    partyAccountId?: string;
    partyStationName?: string;
    excludeId?: string;
  }
): VehicleTripExpenseRecord | null {
  const { vehicleId, tripType, partyAccountId, partyStationName, excludeId } = criteria;

  const matches = records.filter((row) => {
    if (row.id === excludeId) return false;
    if (row.vehicleId !== vehicleId) return false;
    if (row.tripType !== tripType) return false;
    if (tripType === "sales") {
      if (partyAccountId && row.partyAccountId === partyAccountId) return true;
      if (partyStationName && row.partyStationName === partyStationName) return true;
      return false;
    }
    return true;
  });

  if (matches.length === 0) return null;

  return matches.sort((a, b) => {
    const dateCompare = b.tripDate.localeCompare(a.tripDate);
    if (dateCompare !== 0) return dateCompare;
    return b.createdAt.localeCompare(a.createdAt);
  })[0];
}

export function toPreviousTripHistorySummary(
  record: VehicleTripExpenseRecord | null
): PreviousTripHistorySummary | null {
  if (!record) return null;
  return {
    tripDate: record.tripDate,
    fuelCost: record.fuelCost,
    freight: resolveTripFreight(record),
    food: record.dailyFoodAllowance,
  };
}

export function isVehicleAvailableForDispatch(
  records: VehicleTripExpenseRecord[],
  vehicleId: string,
  excludeTripId?: string
): boolean {
  return !records.some(
    (row) =>
      row.vehicleId === vehicleId &&
      row.id !== excludeTripId &&
      row.tripStatus !== "closed_settled"
  );
}
