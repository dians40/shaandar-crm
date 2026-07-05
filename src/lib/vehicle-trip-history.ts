import type { VehicleTripExpenseRecord } from "@/types/vehicle-trip-expense";

export type PreviousTripHistorySummary = {
  tripDate: string;
  fuelCost: number;
  freight: number;
  food: number;
};

export type TripHistoryAuditRow = {
  tripDate: string;
  vehicleRegistration: string;
  fuelCost: number;
  freight: number;
  foodAllowance: number;
  extraCost: number;
};

export function resolveTripFreight(record: VehicleTripExpenseRecord): number {
  return record.tripType === "purchase"
    ? record.tonnageFreight
    : record.stationDistanceFreight;
}

function sortTripsNewestFirst(
  a: VehicleTripExpenseRecord,
  b: VehicleTripExpenseRecord
): number {
  const dateCompare = b.tripDate.localeCompare(a.tripDate);
  if (dateCompare !== 0) return dateCompare;
  return b.createdAt.localeCompare(a.createdAt);
}

function matchesStationCriteria(
  row: VehicleTripExpenseRecord,
  criteria: {
    tripType: VehicleTripExpenseRecord["tripType"];
    partyAccountId?: string;
    partyStationName?: string;
  }
): boolean {
  if (row.tripType !== criteria.tripType) return false;
  if (criteria.tripType === "sales") {
    if (criteria.partyAccountId && row.partyAccountId === criteria.partyAccountId) {
      return true;
    }
    if (criteria.partyStationName && row.partyStationName === criteria.partyStationName) {
      return true;
    }
    return false;
  }
  return true;
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
  const matches = findLastMatchingTrips(records, { ...criteria, limit: 1 });
  return matches[0] ?? null;
}

/** Find the exact last N trips to an identical station (sales) or vehicle route. */
export function findLastMatchingTrips(
  records: VehicleTripExpenseRecord[],
  criteria: {
    vehicleId?: string;
    tripType: VehicleTripExpenseRecord["tripType"];
    partyAccountId?: string;
    partyStationName?: string;
    excludeId?: string;
    limit?: number;
  }
): VehicleTripExpenseRecord[] {
  const { vehicleId, excludeId, limit = 2 } = criteria;

  const matches = records.filter((row) => {
    if (row.id === excludeId) return false;
    if (vehicleId && row.vehicleId !== vehicleId) return false;
    return matchesStationCriteria(row, criteria);
  });

  return matches.sort(sortTripsNewestFirst).slice(0, limit);
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

export function toTripHistoryAuditRow(
  record: VehicleTripExpenseRecord
): TripHistoryAuditRow {
  return {
    tripDate: record.tripDate,
    vehicleRegistration: record.vehicleRegistration,
    fuelCost: record.fuelCost,
    freight: resolveTripFreight(record),
    foodAllowance: record.dailyFoodAllowance,
    extraCost: record.extraExpensesTotal,
  };
}

/** Baseline opening KM from the last closed trip for continuous mileage validation. */
export function getVehicleBaselineOpeningKm(
  records: VehicleTripExpenseRecord[],
  vehicleId: string,
  excludeTripId?: string
): number {
  const closed = records
    .filter(
      (row) =>
        row.vehicleId === vehicleId &&
        row.id !== excludeTripId &&
        row.tripStatus === "closed_settled" &&
        row.closingKm > 0
    )
    .sort(sortTripsNewestFirst);

  return closed[0]?.closingKm ?? 0;
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
