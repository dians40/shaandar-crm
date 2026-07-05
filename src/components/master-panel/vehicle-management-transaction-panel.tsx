"use client";

import { useCallback, useMemo, useState } from "react";
import { Car, Fuel } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useAccounts } from "@/hooks/use-accounts";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { useVehicleTripExpenses } from "@/hooks/use-vehicle-trip-expenses";
import { useVehiclesMaster } from "@/hooks/use-vehicles-master";
import { DEFAULT_STATION_FREIGHT_PER_KM } from "@/lib/vehicle-trip-calculator";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  TONNAGE_RATE_OPTIONS,
  VEHICLE_TRIP_TYPE_OPTIONS,
} from "@/lib/vehicle-trip-calculator";
import {
  EMPTY_VEHICLE_TRIP_FORM,
  applySalesStationKmMapping,
  computeTripAmounts,
  validateVehicleTripForm,
  type VehicleTripExpenseFormState,
  type VehicleTripExpenseRecord,
} from "@/types/vehicle-trip-expense";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
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

type ViewMode = "list" | "add" | "edit";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function VehicleManagementTransactionPanel() {
  const { vehicles, isReady: vehiclesReady } = useVehiclesMaster();
  const { accounts, isReady: accountsReady } = useAccounts();
  const { records, isReady: tripsReady, addTrip, updateTrip } = useVehicleTripExpenses();

  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleTripExpenseFormState>(EMPTY_VEHICLE_TRIP_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      vehicles.map((row) => ({
        value: row.id,
        label: `${row.registrationNumber}${row.averageMileageKmPerLiter > 0 ? ` · ${row.averageMileageKmPerLiter} KM/L` : ""}`,
      })),
    [vehicles]
  );

  const computed = useMemo(() => computeTripAmounts(form), [form]);

  const filtered = useMemo(
    () =>
      records.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.vehicleRegistration, [
          row.tripDate,
          row.tripType,
          row.partyStationName,
          String(row.finalSettlement),
        ])
      ),
    [records, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_VEHICLE_TRIP_FORM);
    setEditingId(null);
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
    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleRegistration: vehicle?.registrationNumber ?? "",
      averageMileageKmPerLiter: vehicle?.averageMileageKmPerLiter ?? 0,
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

  const openEdit = (record: VehicleTripExpenseRecord) => {
    setEditingId(record.id);
    setForm({
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
    });
    setView("edit");
  };

  const handleSave = () => {
    const validationError = validateVehicleTripForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (view === "edit" && editingId) {
      updateTrip(editingId, form);
    } else {
      addTrip(form);
    }
    resetForm();
    setView("list");
  };

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Vehicle Trip"
      active={view === "add" || view === "edit" ? "add" : "list"}
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

  if (!vehiclesReady || !accountsReady || !tripsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading Vehicle Expenses & Trip Calculator...
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <>
        {tabBar}
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Vehicle Trip" : "Edit Vehicle Trip"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Diesel cost engine with fixed vehicle mileage and conditional purchase tonnage or
              sales station routing.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Trip Date"
              type="date"
              required
              value={form.tripDate}
              onChange={(e) => setForm((p) => ({ ...p, tripDate: e.target.value }))}
            />
            <SelectInput
              label="Vehicle"
              required
              value={form.vehicleId}
              placeholder="Select vehicle"
              options={vehicleOptions}
              onChange={(e) => handleVehicleChange(e.target.value)}
            />
            <TextInput
              label="Fixed Average Mileage (KM per Liter)"
              readOnly
              value={
                form.averageMileageKmPerLiter > 0
                  ? String(form.averageMileageKmPerLiter)
                  : "—"
              }
              className="bg-corporate-bg"
              hint="Auto-loaded from Vehicles Master profile"
            />
            <SelectInput
              label="Trip Type"
              required
              value={form.tripType}
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
              label="Opening KM"
              type="number"
              min="0"
              step="0.1"
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
            />
            <TextInput
              label="Closing KM"
              type="number"
              min="0"
              step="0.1"
              value={String(form.closingKm)}
              onChange={(e) =>
                setForm((p) => ({ ...p, closingKm: Number(e.target.value) || 0 }))
              }
              hint={
                form.tripType === "sales" && form.partyDistanceKm > 0
                  ? "Auto-populated from party station distance mapping"
                  : undefined
              }
            />
            <TextInput
              label="Today's Diesel Price per Liter (₹)"
              type="number"
              min="0"
              step="0.01"
              required
              value={String(form.dieselPricePerLiter || "")}
              onChange={(e) =>
                setForm((p) => ({ ...p, dieselPricePerLiter: Number(e.target.value) || 0 }))
              }
            />
            <TextInput
              label="Fuel Cost (Auto-Calculated)"
              readOnly
              value={formatCurrency(computed.fuelCost)}
              className="bg-corporate-bg"
              hint="((Closing KM − Opening KM) ÷ Mileage) × Diesel Price"
            />
            <TextInput
              label="Daily Food Allowance (₹)"
              type="number"
              min="0"
              step="0.01"
              value={String(form.dailyFoodAllowance || "")}
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
                value={String(form.totalTonnageLoaded || "")}
                onChange={(e) =>
                  setForm((p) => ({ ...p, totalTonnageLoaded: Number(e.target.value) || 0 }))
                }
              />
              <SelectInput
                label="Tonnage Rate Option"
                value={form.tonnageRateOption}
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
                hint="Total Tonnage Loaded × Selected Tonnage Rate"
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
                placeholder="Select customer party station"
                options={partyStationOptions}
                onChange={(e) => handlePartyStationChange(e.target.value)}
                hint="Loads pre-configured distance KM from Accounts party profile"
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
                hint={`Distance × ₹${DEFAULT_STATION_FREIGHT_PER_KM} per KM station freight rate`}
              />
            </div>
          )}

          <div className="rounded-xl border-2 border-corporate-brand/30 bg-corporate-brand-light/20 p-5">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-corporate-brand" />
              <h3 className="text-base font-semibold text-corporate-text">
                Live Trip Payout Summary
              </h3>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-corporate-muted">Daily Food Allowance</dt>
                <dd className="text-sm font-medium">{formatCurrency(form.dailyFoodAllowance)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-corporate-muted">Fuel Cost</dt>
                <dd className="text-sm font-medium">{formatCurrency(computed.fuelCost)}</dd>
              </div>
              {form.tripType === "purchase" && (
                <div>
                  <dt className="text-xs uppercase text-corporate-muted">Tonnage Freight</dt>
                  <dd className="text-sm font-medium">
                    {formatCurrency(computed.tonnageFreight)}
                  </dd>
                </div>
              )}
              {form.tripType === "sales" && (
                <div>
                  <dt className="text-xs uppercase text-corporate-muted">Station Distance Freight</dt>
                  <dd className="text-sm font-medium">
                    {formatCurrency(computed.stationDistanceFreight)}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-4 border-t border-corporate-brand/20 pt-4 text-lg font-bold text-corporate-brand">
              Final Settlement: {formatCurrency(computed.finalSettlement)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-corporate-brand px-5 py-2 text-sm font-medium text-white"
            >
              Save Trip Expense
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("list");
              }}
              className="rounded-full border border-corporate-border px-5 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
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
        title="Vehicle Expenses & Trip Log"
        subtitle="Fuel, tonnage, and station-distance settlement calculator."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Trip Type</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Fuel Cost</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Final Settlement</th>
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
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={row.vehicleRegistration}
                    onEdit={() => openEdit(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.tripDate}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {row.tripType === "purchase" ? "Purchase / Inward" : "Sales / Outward"}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {formatCurrency(row.fuelCost)}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {formatCurrency(row.finalSettlement)}
                  </td>
                  <UniversalMasterListActionsCell>
                    <ModuleListActionGroup
                      showView={false}
                      onEdit={() => openEdit(row)}
                      editLabel="Edit Trip"
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
