"use client";

import { useCallback, useMemo, useState } from "react";
import { Car, Plus, Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useAccounts } from "@/hooks/use-accounts";
import { useEmployees } from "@/hooks/use-employees";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { useVehicleTripExpenses } from "@/hooks/use-vehicle-trip-expenses";
import { useVehiclesMaster } from "@/hooks/use-vehicles-master";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  DEFAULT_STATION_FREIGHT_PER_KM,
  TONNAGE_RATE_OPTIONS,
  VEHICLE_TRIP_TYPE_OPTIONS,
} from "@/lib/vehicle-trip-calculator";
import {
  findLastMatchingTrips,
  getVehicleBaselineOpeningKm,
  isVehicleAvailableForDispatch,
  toTripHistoryAuditRow,
} from "@/lib/vehicle-trip-history";
import {
  EMPTY_VEHICLE_TRIP_FORM,
  FINANCIAL_APPROVAL_STATUS_LABELS,
  VEHICLE_TRIP_STATUS_LABELS,
  applySalesStationKmMapping,
  computeTripAmounts,
  createOnRouteExtraExpense,
  validateVehicleTripForm,
  type VehicleTripExpenseFormState,
  type VehicleTripExpenseRecord,
} from "@/types/vehicle-trip-expense";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import SalesTripHistoryWidget from "./shared/sales-trip-history-widget";
import SinglePhotoUploader from "./shared/single-photo-uploader";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  UniversalMasterListNameCell,
  UniversalMasterListRow,
  UniversalMasterListShell,
  UniversalMasterListTable,
  UniversalMasterListActionsCell,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "ledger";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function recordToForm(record: VehicleTripExpenseRecord): VehicleTripExpenseFormState {
  return {
    tripDate: record.tripDate,
    vehicleId: record.vehicleId,
    vehicleRegistration: record.vehicleRegistration,
    averageMileageKmPerLiter: record.averageMileageKmPerLiter,
    openingKm: record.openingKm,
    closingKm: record.closingKm,
    dieselPricePerLiter: record.dieselPricePerLiter,
    tripType: record.tripType,
    totalTonnageLoaded: record.totalTonnageLoaded,
    tonnageRateOption: record.tonnageRateOption,
    customTonnageRate: record.customTonnageRate,
    partyAccountId: record.partyAccountId,
    partyStationName: record.partyStationName,
    partyDistanceKm: record.partyDistanceKm,
    dailyFoodAllowance: record.dailyFoodAllowance,
    tripStatus: record.tripStatus,
    settlementStatus: record.settlementStatus,
    cashAdvanceGiven: record.cashAdvanceGiven,
    driverAcceptedAt: record.driverAcceptedAt,
    driverAcceptedOpeningKm: record.driverAcceptedOpeningKm,
    onRouteExtraExpenses: record.onRouteExtraExpenses,
    supervisorVerifiedAt: record.supervisorVerifiedAt,
    supervisorVerifiedBy: record.supervisorVerifiedBy,
    financialApprovalStatus: record.financialApprovalStatus,
    accountantApprovedAt: record.accountantApprovedAt,
    accountantApprovedBy: record.accountantApprovedBy,
    cashierDisbursedAt: record.cashierDisbursedAt,
    cashierDisbursedBy: record.cashierDisbursedBy,
    driverMode: record.driverMode,
    driverEmployeeId: record.driverEmployeeId,
    driverName: record.driverName,
    driverPhone: record.driverPhone,
    temporaryDriverDocumentPhoto: record.temporaryDriverDocumentPhoto,
    openingKmBaselineLocked: record.openingKmBaselineLocked,
  };
}

function statusBadgeClass(status: VehicleTripExpenseRecord["tripStatus"]): string {
  switch (status) {
    case "pending_driver_acceptance":
      return "bg-amber-100 text-amber-800";
    case "on_route":
      return "bg-sky-100 text-sky-800";
    case "delivered":
      return "bg-violet-100 text-violet-800";
    default:
      return "bg-emerald-100 text-emerald-800";
  }
}

export default function VehicleManagementTransactionPanel() {
  const { vehicles, isReady: vehiclesReady } = useVehiclesMaster();
  const { accounts, isReady: accountsReady } = useAccounts();
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { records, isReady: tripsReady, addTrip, updateTrip, patchTrip } =
    useVehicleTripExpenses();

  const [view, setView] = useState<ViewMode>("list");
  const [ledgerId, setLedgerId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleTripExpenseFormState>(EMPTY_VEHICLE_TRIP_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isLedger = view === "ledger" && Boolean(ledgerId);
  const openingKmLocked =
    form.openingKmBaselineLocked ||
    (isLedger &&
      (form.tripStatus === "on_route" ||
        form.tripStatus === "delivered" ||
        form.tripStatus === "closed_settled"));

  const partyStationOptions = useMemo(
    () =>
      accounts
        .filter((row) => row.stationDestination.trim() || row.distanceKm > 0)
        .map((row) => ({
          value: row.id,
          label: row.stationDestination.trim()
            ? `${row.name} — ${row.stationDestination} (${row.distanceKm} KM)`
            : `${row.name} (${row.distanceKm} KM)`,
        })),
    [accounts]
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((row) => {
        const available = isVehicleAvailableForDispatch(records, row.id, ledgerId ?? undefined);
        return {
          value: row.id,
          label: `${row.registrationNumber}${row.averageMileageKmPerLiter > 0 ? ` · ${row.averageMileageKmPerLiter} KM/L` : ""}${available ? "" : " · On Trip"}`,
        };
      }),
    [vehicles, records, ledgerId, form.vehicleId]
  );

  const computed = useMemo(() => computeTripAmounts(form), [form]);

  const driverEmployeeOptions = useMemo(
    () => employees.map((row) => ({ value: row.id, label: row.name })),
    [employees]
  );

  const twoTripHistory = useMemo(() => {
    if (!form.vehicleId || form.tripType !== "sales" || !form.partyAccountId) {
      return [];
    }
    return findLastMatchingTrips(records, {
      vehicleId: form.vehicleId,
      tripType: "sales",
      partyAccountId: form.partyAccountId,
      partyStationName: form.partyStationName,
      excludeId: ledgerId ?? undefined,
      limit: 2,
    }).map(toTripHistoryAuditRow);
  }, [
    records,
    form.vehicleId,
    form.tripType,
    form.partyAccountId,
    form.partyStationName,
    ledgerId,
  ]);

  const filtered = useMemo(
    () =>
      records.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.vehicleRegistration, [
          row.tripDate,
          row.tripType,
          row.partyStationName,
          VEHICLE_TRIP_STATUS_LABELS[row.tripStatus],
          String(row.finalSettlement),
        ])
      ),
    [records, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_VEHICLE_TRIP_FORM);
    setLedgerId(null);
    setError(null);
  };

  const resetPanelState = useCallback(() => {
    resetForm();
    setView("list");
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((row) => row.id === vehicleId);
    const baselineKm = getVehicleBaselineOpeningKm(records, vehicleId, ledgerId ?? undefined);
    const mapped =
      form.tripType === "sales" && form.partyDistanceKm > 0
        ? applySalesStationKmMapping(baselineKm, form.partyDistanceKm)
        : { openingKm: baselineKm, closingKm: baselineKm };

    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleRegistration: vehicle?.registrationNumber ?? "",
      averageMileageKmPerLiter: vehicle?.averageMileageKmPerLiter ?? 0,
      openingKm: mapped.openingKm,
      closingKm: mapped.closingKm,
      openingKmBaselineLocked: baselineKm > 0,
      driverName: prev.driverMode === "assigned" ? vehicle?.driverName ?? prev.driverName : prev.driverName,
    }));
  };

  const handlePartyStationChange = (accountId: string) => {
    const account = accounts.find((row) => row.id === accountId);
    if (!account) {
      setForm((prev) => ({
        ...prev,
        partyAccountId: "",
        partyStationName: "",
        partyDistanceKm: 0,
      }));
      return;
    }

    const stationLabel = account.stationDestination.trim() || account.name;
    const mapped = applySalesStationKmMapping(form.openingKm, account.distanceKm);

    setForm((prev) => ({
      ...prev,
      partyAccountId: accountId,
      partyStationName: stationLabel,
      partyDistanceKm: account.distanceKm,
      openingKm: mapped.openingKm,
      closingKm: mapped.closingKm,
    }));
  };

  const openLedger = (record: VehicleTripExpenseRecord) => {
    setLedgerId(record.id);
    setForm(recordToForm(record));
    setView("ledger");
  };

  const handleDispatchSave = () => {
    const validationError = validateVehicleTripForm(form, { isDispatch: true });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (form.driverMode === "assigned" && !form.driverEmployeeId && !form.driverName.trim()) {
      setError("Driver selection is required.");
      return;
    }
    if (form.driverMode === "temporary") {
      if (!form.driverName.trim() || !form.driverPhone.trim()) {
        setError("Temporary driver name and phone number are required.");
        return;
      }
      if (!form.temporaryDriverDocumentPhoto.trim()) {
        setError("Temporary driver license / document upload is required.");
        return;
      }
    }
    if (!isVehicleAvailableForDispatch(records, form.vehicleId)) {
      setError("This vehicle is already on an active trip. Close the open ledger first.");
      return;
    }

    const dispatchForm: VehicleTripExpenseFormState = {
      ...form,
      tripStatus: "pending_driver_acceptance",
      settlementStatus: "due",
      cashAdvanceGiven: computed.cashAdvanceGiven,
      driverAcceptedAt: null,
      driverAcceptedOpeningKm: null,
      onRouteExtraExpenses: [],
      supervisorVerifiedAt: null,
      supervisorVerifiedBy: null,
    };

    addTrip(dispatchForm);
    resetForm();
    setView("list");
  };

  const saveLedgerProgress = () => {
    if (!ledgerId) return;
    updateTrip(ledgerId, {
      ...form,
      cashAdvanceGiven: computed.cashAdvanceGiven,
    });
    setError(null);
  };

  const handleDriverAccept = () => {
    if (!ledgerId) return;
    patchTrip(ledgerId, {
      tripStatus: "on_route",
      driverAcceptedAt: new Date().toISOString(),
      driverAcceptedOpeningKm: form.openingKm,
      openingKm: form.openingKm,
      cashAdvanceGiven: computed.cashAdvanceGiven,
    });
    setForm((prev) => ({
      ...prev,
      tripStatus: "on_route",
      driverAcceptedAt: new Date().toISOString(),
      driverAcceptedOpeningKm: form.openingKm,
    }));
  };

  const handleMarkDelivered = () => {
    if (!ledgerId) return;
    if (form.closingKm < form.openingKm) {
      setError("Closing KM must be greater than or equal to Opening KM.");
      return;
    }
    saveLedgerProgress();
    patchTrip(ledgerId, {
      tripStatus: "delivered",
      financialApprovalStatus: "pending_accountant_review",
    });
    setForm((prev) => ({
      ...prev,
      tripStatus: "delivered",
      financialApprovalStatus: "pending_accountant_review",
    }));
  };

  const handleAccountantApprove = () => {
    if (!ledgerId) return;
    saveLedgerProgress();
    patchTrip(ledgerId, {
      financialApprovalStatus: "pending_cashier_payout",
      accountantApprovedAt: new Date().toISOString(),
      accountantApprovedBy: "Accountant",
    });
    setForm((prev) => ({
      ...prev,
      financialApprovalStatus: "pending_cashier_payout",
      accountantApprovedAt: new Date().toISOString(),
      accountantApprovedBy: "Accountant",
    }));
  };

  const handleCashierPayout = () => {
    if (!ledgerId) return;
    saveLedgerProgress();
    patchTrip(ledgerId, {
      tripStatus: "closed_settled",
      settlementStatus: "paid_settled",
      financialApprovalStatus: "settled_paid",
      cashierDisbursedAt: new Date().toISOString(),
      cashierDisbursedBy: "Cashier",
      supervisorVerifiedAt: new Date().toISOString(),
      supervisorVerifiedBy: "Cashier Payout",
      netDueCashBalance: computed.netDueCashBalance,
      extraExpensesTotal: computed.extraExpensesTotal,
      fuelCost: computed.fuelCost,
      finalSettlement: computed.finalSettlement,
    });
    resetForm();
    setView("list");
  };

  const addExtraExpenseRow = () => {
    setForm((prev) => ({
      ...prev,
      onRouteExtraExpenses: [...prev.onRouteExtraExpenses, createOnRouteExtraExpense()],
    }));
  };

  const updateExtraExpense = (
    id: string,
    patch: Partial<{ description: string; amount: number }>
  ) => {
    setForm((prev) => ({
      ...prev,
      onRouteExtraExpenses: prev.onRouteExtraExpenses.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  };

  const removeExtraExpense = (id: string) => {
    setForm((prev) => ({
      ...prev,
      onRouteExtraExpenses: prev.onRouteExtraExpenses.filter((row) => row.id !== id),
    }));
  };

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Vehicle Trip"
      active={view === "list" ? "list" : "add"}
      onList={() => {
        resetForm();
        setView("list");
      }}
      onAdd={() => {
        resetForm();
        setView("add");
      }}
    />
  );

  const renderTripFields = (mode: "dispatch" | "ledger") => (
    <>
      {twoTripHistory.length > 0 && form.tripType === "sales" && (
        <SalesTripHistoryWidget rows={twoTripHistory} />
      )}

      <div className="rounded-xl border border-corporate-border bg-corporate-bg/30 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-corporate-text">Driver Allocation</h3>
        <div className="flex flex-wrap gap-2">
          {(["assigned", "temporary"] as const).map((driverMode) => (
            <button
              key={driverMode}
              type="button"
              disabled={mode === "ledger" && form.tripStatus !== "pending_driver_acceptance"}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  driverMode,
                  driverEmployeeId: driverMode === "assigned" ? prev.driverEmployeeId : "",
                  driverName: driverMode === "temporary" ? prev.driverName : "",
                  driverPhone: driverMode === "temporary" ? prev.driverPhone : "",
                  temporaryDriverDocumentPhoto:
                    driverMode === "temporary" ? prev.temporaryDriverDocumentPhoto : "",
                }))
              }
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                form.driverMode === driverMode
                  ? "border-corporate-brand bg-corporate-brand text-white"
                  : "border-corporate-border bg-white"
              }`}
            >
              {driverMode === "assigned" ? "Assigned Driver" : "Add Temporary / New Driver"}
            </button>
          ))}
        </div>

        {form.driverMode === "assigned" ? (
          <SelectInput
            label="Driver Selection"
            value={form.driverEmployeeId}
            onChange={(event) => {
              const employee = employees.find((row) => row.id === event.target.value);
              setForm((prev) => ({
                ...prev,
                driverEmployeeId: event.target.value,
                driverName: employee?.name ?? prev.driverName,
              }));
            }}
            options={driverEmployeeOptions}
            placeholder="Select driver (dynamic — not fixed to vehicle)"
            disabled={mode === "ledger" && form.tripStatus !== "pending_driver_acceptance"}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Driver Name"
              value={form.driverName}
              onChange={(event) => setForm((prev) => ({ ...prev, driverName: event.target.value }))}
              disabled={mode === "ledger" && form.tripStatus !== "pending_driver_acceptance"}
            />
            <TextInput
              label="Phone Number"
              value={form.driverPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, driverPhone: event.target.value }))}
              disabled={mode === "ledger" && form.tripStatus !== "pending_driver_acceptance"}
            />
            <div className="sm:col-span-2">
              <SinglePhotoUploader
                label="Driver Documents / License Cover"
                photo={form.temporaryDriverDocumentPhoto}
                onChange={(photo) =>
                  setForm((prev) => ({ ...prev, temporaryDriverDocumentPhoto: photo }))
                }
                disabled={mode === "ledger" && form.tripStatus !== "pending_driver_acceptance"}
              />
              {form.temporaryDriverDocumentPhoto && (
                <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  Compliance Document Active
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Trip Date"
          type="date"
          required
          value={form.tripDate}
          disabled={mode === "ledger" && form.tripStatus === "closed_settled"}
          onChange={(e) => setForm((p) => ({ ...p, tripDate: e.target.value }))}
        />
        <SelectInput
          label="Vehicle"
          required
          value={form.vehicleId}
          placeholder="Select vehicle"
          options={vehicleOptions}
          disabled={mode === "ledger"}
          onChange={(e) => handleVehicleChange(e.target.value)}
        />
        <TextInput
          label="Trip Status"
          readOnly
          value={VEHICLE_TRIP_STATUS_LABELS[form.tripStatus]}
          className="bg-corporate-bg"
        />
        <TextInput
          label="Estimated Cash Advance (₹)"
          readOnly
          value={formatCurrency(computed.cashAdvanceGiven)}
          className="bg-corporate-bg"
          hint="Auto-calculated at dispatch from fuel, food, and freight"
        />
        <SelectInput
          label="Trip Type"
          required
          value={form.tripType}
          disabled={mode === "ledger"}
          options={VEHICLE_TRIP_TYPE_OPTIONS.map((row) => ({
            value: row.value,
            label: row.label,
          }))}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              tripType: e.target.value as VehicleTripExpenseFormState["tripType"],
              totalTonnageLoaded: 0,
              partyAccountId: "",
              partyStationName: "",
              partyDistanceKm: 0,
            }))
          }
        />
        <TextInput
          label="Fixed Average Mileage (KM per Liter)"
          readOnly
          value={
            form.averageMileageKmPerLiter > 0 ? String(form.averageMileageKmPerLiter) : "—"
          }
          className="bg-corporate-bg"
        />
        <TextInput
          label="Opening KM"
          type="number"
          min="0"
          step="0.1"
          readOnly={openingKmLocked}
          value={String(form.openingKm)}
          onChange={(e) => {
            const openingKm = Number(e.target.value) || 0;
            setForm((prev) => {
              if (prev.tripType === "sales" && prev.partyDistanceKm > 0) {
                const mapped = applySalesStationKmMapping(openingKm, prev.partyDistanceKm);
                return { ...prev, ...mapped };
              }
              return { ...prev, openingKm };
            });
          }}
          hint={
            openingKmLocked
              ? form.openingKmBaselineLocked
                ? "Locked from previous trip closing KM baseline"
                : "Locked after driver acceptance"
              : undefined
          }
        />
        <TextInput
          label="Closing KM"
          type="number"
          min="0"
          step="0.1"
          value={String(form.closingKm)}
          disabled={
            form.tripStatus === "pending_driver_acceptance" ||
            form.tripStatus === "closed_settled"
          }
          onChange={(e) => setForm((p) => ({ ...p, closingKm: Number(e.target.value) || 0 }))}
        />
        <TextInput
          label="Today's Diesel Price per Liter (₹)"
          type="number"
          min="0"
          step="0.01"
          required
          value={String(form.dieselPricePerLiter || "")}
          disabled={form.tripStatus === "closed_settled"}
          onChange={(e) =>
            setForm((p) => ({ ...p, dieselPricePerLiter: Number(e.target.value) || 0 }))
          }
        />
        <TextInput
          label="Fuel Cost (Auto-Calculated)"
          readOnly
          value={formatCurrency(computed.fuelCost)}
          className="bg-corporate-bg"
        />
        <TextInput
          label="Daily Food Allowance (₹)"
          type="number"
          min="0"
          step="0.01"
          value={String(form.dailyFoodAllowance || "")}
          disabled={form.tripStatus === "closed_settled"}
          onChange={(e) =>
            setForm((p) => ({ ...p, dailyFoodAllowance: Number(e.target.value) || 0 }))
          }
        />
      </div>

      {form.tripType === "purchase" && (
        <div className="grid gap-4 rounded-lg border border-corporate-border bg-corporate-bg/40 p-4 sm:grid-cols-2">
          <h3 className="sm:col-span-2 text-sm font-semibold text-corporate-text">
            Purchase / Inward — Tonnage Freight
          </h3>
          <TextInput
            label="Total Tonnage Loaded"
            type="number"
            min="0"
            step="0.01"
            required
            disabled={mode === "ledger" && form.tripStatus !== "pending_driver_acceptance"}
            value={String(form.totalTonnageLoaded || "")}
            onChange={(e) =>
              setForm((p) => ({ ...p, totalTonnageLoaded: Number(e.target.value) || 0 }))
            }
          />
          <SelectInput
            label="Tonnage Rate Option"
            value={form.tonnageRateOption}
            disabled={mode === "ledger" && form.tripStatus !== "pending_driver_acceptance"}
            options={TONNAGE_RATE_OPTIONS.map((row) => ({
              value: row.value,
              label: row.label,
            }))}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                tonnageRateOption: e.target.value as VehicleTripExpenseFormState["tonnageRateOption"],
              }))
            }
          />
          {form.tonnageRateOption === "custom" && (
            <TextInput
              label="Custom Tonnage Rate (₹ per Ton)"
              type="number"
              min="0"
              step="0.01"
              value={String(form.customTonnageRate || "")}
              onChange={(e) =>
                setForm((p) => ({ ...p, customTonnageRate: Number(e.target.value) || 0 }))
              }
            />
          )}
          <TextInput
            label="Tonnage Freight (Auto-Calculated)"
            readOnly
            value={formatCurrency(computed.tonnageFreight)}
            className="bg-corporate-bg sm:col-span-2"
          />
        </div>
      )}

      {form.tripType === "sales" && (
        <div className="grid gap-4 rounded-lg border border-corporate-border bg-corporate-bg/40 p-4 sm:grid-cols-2">
          <h3 className="sm:col-span-2 text-sm font-semibold text-corporate-text">
            Sales / Outward — Party Station Routing
          </h3>
          <SelectInput
            label="Party Station / Destination"
            required
            value={form.partyAccountId}
            disabled={mode === "ledger"}
            placeholder="Select customer party station"
            options={partyStationOptions}
            onChange={(e) => handlePartyStationChange(e.target.value)}
          />
          <TextInput
            label="Station Distance (KM)"
            readOnly
            value={form.partyDistanceKm > 0 ? String(form.partyDistanceKm) : "—"}
            className="bg-corporate-bg"
          />
          <TextInput
            label="Station Distance Freight (Auto-Calculated)"
            readOnly
            value={formatCurrency(computed.stationDistanceFreight)}
            className="bg-corporate-bg sm:col-span-2"
            hint={`Distance × ₹${DEFAULT_STATION_FREIGHT_PER_KM} per KM`}
          />
        </div>
      )}
    </>
  );

  if (!vehiclesReady || !accountsReady || !tripsReady || employeesLoading) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading Vehicle Expenses & Trip Calculator...
      </div>
    );
  }

  if (view === "add") {
    return (
      <>
        {tabBar}
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">Dispatch New Trip</h2>
            <p className="text-sm text-corporate-muted">
              Stage 1 — log dispatch, generate cash advance estimate, and queue driver acceptance.
            </p>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {renderTripFields("dispatch")}
          <div className="rounded-xl border-2 border-corporate-brand/30 bg-corporate-brand-light/20 p-5">
            <p className="text-lg font-bold text-corporate-brand">
              Estimated Cash Advance: {formatCurrency(computed.cashAdvanceGiven)}
            </p>
            <p className="mt-1 text-sm text-corporate-muted">
              Final Settlement Preview: {formatCurrency(computed.finalSettlement)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDispatchSave}
            className="rounded-full bg-corporate-brand px-5 py-2 text-sm font-medium text-white"
          >
            Log Dispatch & Queue Driver Acceptance
          </button>
        </div>
      </>
    );
  }

  if (view === "ledger" && ledgerId) {
    return (
      <>
        {tabBar}
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-corporate-text">
                Trip Ledger — {form.vehicleRegistration}
              </h2>
              <p className="text-sm text-corporate-muted">
                3-way verification: driver acceptance → arrival settlement → supervisor close.
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase ${statusBadgeClass(form.tripStatus)}`}
            >
              {VEHICLE_TRIP_STATUS_LABELS[form.tripStatus]}
            </span>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {renderTripFields("ledger")}

          {form.tripStatus === "pending_driver_acceptance" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Departure Stage — Cash advance ready: {formatCurrency(computed.cashAdvanceGiven)}
              </p>
              <button
                type="button"
                onClick={handleDriverAccept}
                className="mt-3 rounded-full bg-corporate-brand px-5 py-2 text-sm font-semibold text-white"
              >
                Driver: Accept Trip & Advance
              </button>
            </div>
          )}

          {(form.tripStatus === "on_route" || form.tripStatus === "delivered") && (
            <div className="space-y-4 rounded-xl border border-corporate-border bg-corporate-bg/40 p-4">
              <h3 className="text-sm font-semibold text-corporate-text">
                Arrival & Extra Expense Settlement
              </h3>
              <div className="space-y-3">
                {form.onRouteExtraExpenses.map((row) => (
                  <div key={row.id} className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                    <TextInput
                      label="Expense Type / Description"
                      value={row.description}
                      placeholder="Toll, Repair, Challan..."
                      onChange={(e) =>
                        updateExtraExpense(row.id, { description: e.target.value })
                      }
                    />
                    <TextInput
                      label="Amount Spent (₹)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(row.amount || "")}
                      onChange={(e) =>
                        updateExtraExpense(row.id, { amount: Number(e.target.value) || 0 })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeExtraExpense(row.id)}
                      className="mt-6 inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExtraExpenseRow}
                className="inline-flex items-center gap-1.5 rounded-full border border-corporate-border px-4 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add On-Route Extra Expense
              </button>

              <div className="rounded-lg border border-corporate-brand/30 bg-white p-4">
                <p className="text-sm text-corporate-muted">Cash Balance Reconciliation</p>
                <p className="mt-2 text-base font-bold text-corporate-text">
                  Net Due Cash Balance to Handover:{" "}
                  <span className="text-corporate-brand">
                    {formatCurrency(computed.netDueCashBalance)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-corporate-muted">
                  Cash Advance ({formatCurrency(computed.cashAdvanceGiven)}) − (Fuel{" "}
                  {formatCurrency(computed.fuelCost)} + Food{" "}
                  {formatCurrency(form.dailyFoodAllowance)} + Extras{" "}
                  {formatCurrency(computed.extraExpensesTotal)})
                </p>
              </div>

              {form.tripStatus === "on_route" && (
                <button
                  type="button"
                  onClick={handleMarkDelivered}
                  className="rounded-full border border-corporate-brand px-5 py-2 text-sm font-semibold text-corporate-brand"
                >
                  Mark Trip Delivered
                </button>
              )}
            </div>
          )}

          {form.tripStatus === "delivered" && (
            <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-sm font-medium text-violet-900">
                Financial Approval —{" "}
                {FINANCIAL_APPROVAL_STATUS_LABELS[form.financialApprovalStatus]}
              </p>

              {form.financialApprovalStatus === "pending_accountant_review" && (
                <button
                  type="button"
                  onClick={handleAccountantApprove}
                  className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white"
                >
                  Accountant: Approve Expense Tally
                </button>
              )}

              {form.financialApprovalStatus === "pending_cashier_payout" && (
                <button
                  type="button"
                  onClick={handleCashierPayout}
                  className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white"
                >
                  Cashier: Clear Cash Payout / Disburse Balance
                </button>
              )}
            </div>
          )}

          {form.tripStatus === "closed_settled" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Trip settled as <strong>{FINANCIAL_APPROVAL_STATUS_LABELS.settled_paid}</strong>.
              Vehicle is available for next dispatch. Closing KM{" "}
              {form.closingKm.toLocaleString("en-IN")} saved as meter baseline.
              Net balance handed over: {formatCurrency(computed.netDueCashBalance)}
            </div>
          )}

          {form.tripStatus !== "closed_settled" && (
            <button
              type="button"
              onClick={saveLedgerProgress}
              className="rounded-full border border-corporate-border px-5 py-2 text-sm"
            >
              Save Ledger Progress
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {tabBar}
      <UniversalMasterListShell
        moduleName="Vehicle Trip"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Vehicle Trip Verification Ledger"
        subtitle="Historical audit, driver acceptance, cash reconciliation, and supervisor settlement."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Advance</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Net Due</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Car className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  {searchQuery.trim() ? LIST_SEARCH_EMPTY_MESSAGE : "No vehicle trips logged yet."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openLedger(row)}>
                  <UniversalMasterListNameCell
                    name={row.vehicleRegistration}
                    onEdit={() => openLedger(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.tripDate}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.tripStatus)}`}
                    >
                      {VEHICLE_TRIP_STATUS_LABELS[row.tripStatus]}
                    </span>
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {formatCurrency(row.cashAdvanceGiven)}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {formatCurrency(row.netDueCashBalance)}
                  </td>
                  <UniversalMasterListActionsCell>
                    <ModuleListActionGroup
                      showView={false}
                      onEdit={() => openLedger(row)}
                      editLabel="Open Ledger"
                    />
                  </UniversalMasterListActionsCell>
                </UniversalMasterListRow>
              ))
            )}
          </tbody>
        </UniversalMasterListTable>
      </UniversalMasterListShell>
    </>
  );
}
