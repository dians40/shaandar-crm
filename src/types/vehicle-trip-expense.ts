import {
  applySalesStationKmMapping,
  calculateEstimatedCashAdvance,
  calculateFinalTripSettlement,
  calculateFuelCost,
  calculateNetDueCashBalance,
  calculateStationDistanceFreight,
  calculateTonnageFreight,
  resolveTonnageRate,
  sumOnRouteExtraExpenses,
  type TonnageRateOption,
  type VehicleTripType,
} from "@/lib/vehicle-trip-calculator";

export type VehicleTripStatus =
  | "pending_driver_acceptance"
  | "on_route"
  | "delivered"
  | "closed_settled";

export type VehicleTripSettlementStatus = "due" | "paid_settled";

export type FinancialApprovalStatus =
  | "none"
  | "pending_accountant_review"
  | "pending_cashier_payout"
  | "settled_paid";

export const FINANCIAL_APPROVAL_STATUS_LABELS: Record<FinancialApprovalStatus, string> = {
  none: "Not Started",
  pending_accountant_review: "Pending Accountant Review",
  pending_cashier_payout: "Pending Cashier Payout",
  settled_paid: "SETTLED / PAID",
};

export type TripDriverMode = "assigned" | "temporary";

export type OnRouteExtraExpense = {
  id: string;
  description: string;
  amount: number;
};

export const VEHICLE_TRIP_STATUS_LABELS: Record<VehicleTripStatus, string> = {
  pending_driver_acceptance: "Dispatched / Pending Driver Acceptance",
  on_route: "On-Route",
  delivered: "Delivered",
  closed_settled: "Closed / Settled",
};

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
  tripStatus: VehicleTripStatus;
  settlementStatus: VehicleTripSettlementStatus;
  cashAdvanceGiven: number;
  driverAcceptedAt: string | null;
  driverAcceptedOpeningKm: number | null;
  onRouteExtraExpenses: OnRouteExtraExpense[];
  extraExpensesTotal: number;
  netDueCashBalance: number;
  supervisorVerifiedAt: string | null;
  supervisorVerifiedBy: string | null;
  financialApprovalStatus: FinancialApprovalStatus;
  accountantApprovedAt: string | null;
  accountantApprovedBy: string | null;
  cashierDisbursedAt: string | null;
  cashierDisbursedBy: string | null;
  driverMode: TripDriverMode;
  driverEmployeeId: string;
  driverName: string;
  driverPhone: string;
  temporaryDriverDocumentPhoto: string;
  openingKmBaselineLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VehicleTripExpenseFormState = Omit<
  VehicleTripExpenseRecord,
  | "id"
  | "fuelCost"
  | "tonnageFreight"
  | "stationDistanceFreight"
  | "finalSettlement"
  | "extraExpensesTotal"
  | "netDueCashBalance"
  | "createdAt"
  | "updatedAt"
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
  tripStatus: "pending_driver_acceptance",
  settlementStatus: "due",
  cashAdvanceGiven: 0,
  driverAcceptedAt: null,
  driverAcceptedOpeningKm: null,
  onRouteExtraExpenses: [],
  supervisorVerifiedAt: null,
  supervisorVerifiedBy: null,
  financialApprovalStatus: "none",
  accountantApprovedAt: null,
  accountantApprovedBy: null,
  cashierDisbursedAt: null,
  cashierDisbursedBy: null,
  driverMode: "assigned",
  driverEmployeeId: "",
  driverName: "",
  driverPhone: "",
  temporaryDriverDocumentPhoto: "",
  openingKmBaselineLocked: false,
};

export type ComputedTripAmounts = {
  fuelCost: number;
  tonnageFreight: number;
  stationDistanceFreight: number;
  finalSettlement: number;
  cashAdvanceGiven: number;
  extraExpensesTotal: number;
  netDueCashBalance: number;
};

export function createOnRouteExtraExpense(
  description = "",
  amount = 0
): OnRouteExtraExpense {
  return {
    id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description,
    amount,
  };
}

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

  const cashAdvanceGiven =
    form.cashAdvanceGiven > 0
      ? form.cashAdvanceGiven
      : calculateEstimatedCashAdvance(
          form.dailyFoodAllowance,
          fuelCost,
          tonnageFreight,
          stationDistanceFreight
        );

  const extraExpensesTotal = sumOnRouteExtraExpenses(form.onRouteExtraExpenses);

  const netDueCashBalance = calculateNetDueCashBalance(
    cashAdvanceGiven,
    fuelCost,
    form.dailyFoodAllowance,
    extraExpensesTotal
  );

  return {
    fuelCost,
    tonnageFreight,
    stationDistanceFreight,
    finalSettlement,
    cashAdvanceGiven,
    extraExpensesTotal,
    netDueCashBalance,
  };
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
    tripStatus: row.tripStatus ?? "closed_settled",
    settlementStatus: row.settlementStatus ?? "paid_settled",
    cashAdvanceGiven: Number(row.cashAdvanceGiven) || 0,
    driverAcceptedAt: row.driverAcceptedAt ?? null,
    driverAcceptedOpeningKm:
      row.driverAcceptedOpeningKm != null ? Number(row.driverAcceptedOpeningKm) : null,
    onRouteExtraExpenses: Array.isArray(row.onRouteExtraExpenses)
      ? row.onRouteExtraExpenses
      : [],
    supervisorVerifiedAt: row.supervisorVerifiedAt ?? null,
    supervisorVerifiedBy: row.supervisorVerifiedBy ?? null,
    financialApprovalStatus: row.financialApprovalStatus ?? "none",
    accountantApprovedAt: row.accountantApprovedAt ?? null,
    accountantApprovedBy: row.accountantApprovedBy ?? null,
    cashierDisbursedAt: row.cashierDisbursedAt ?? null,
    cashierDisbursedBy: row.cashierDisbursedBy ?? null,
    driverMode: row.driverMode === "temporary" ? "temporary" : "assigned",
    driverEmployeeId: row.driverEmployeeId ?? "",
    driverName: row.driverName ?? "",
    driverPhone: row.driverPhone ?? "",
    temporaryDriverDocumentPhoto: row.temporaryDriverDocumentPhoto ?? "",
    openingKmBaselineLocked: Boolean(row.openingKmBaselineLocked),
  };

  const computed = computeTripAmounts(form);

  return {
    id: row.id,
    ...form,
    fuelCost: row.fuelCost ?? computed.fuelCost,
    tonnageFreight: row.tonnageFreight ?? computed.tonnageFreight,
    stationDistanceFreight: row.stationDistanceFreight ?? computed.stationDistanceFreight,
    finalSettlement: row.finalSettlement ?? computed.finalSettlement,
    cashAdvanceGiven: row.cashAdvanceGiven ?? computed.cashAdvanceGiven,
    extraExpensesTotal: row.extraExpensesTotal ?? computed.extraExpensesTotal,
    netDueCashBalance: row.netDueCashBalance ?? computed.netDueCashBalance,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function validateVehicleTripForm(
  form: VehicleTripExpenseFormState,
  options?: { isDispatch?: boolean }
): string | null {
  if (!form.tripDate.trim()) return "Trip date is required.";
  if (!form.vehicleId) return "Vehicle selection is required.";
  if (form.averageMileageKmPerLiter <= 0) {
    return "Selected vehicle must have Average Mileage (KM per Liter) configured in Vehicles Master.";
  }
  if (form.dieselPricePerLiter <= 0) return "Today's diesel price per liter is required.";
  if (form.tripType === "purchase" && form.totalTonnageLoaded <= 0) {
    return "Total tonnage loaded is required for purchase / inward trips.";
  }
  if (form.tripType === "sales" && !form.partyAccountId) {
    return "Party station / destination is required for sales / outward trips.";
  }
  if (!options?.isDispatch && form.closingKm < form.openingKm) {
    return "Closing KM must be greater than or equal to Opening KM.";
  }
  return null;
}

export { applySalesStationKmMapping };
