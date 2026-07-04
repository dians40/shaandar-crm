"use client";

import { useMemo, useState } from "react";
import { Car } from "lucide-react";
import { TextInput } from "@/components/forms/form-fields";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useVehiclesMaster } from "@/hooks/use-vehicles-master";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  EMPTY_VEHICLE_MASTER_FORM,
  VEHICLE_DOCUMENT_LABELS,
  validateVehicleMasterForm,
  type VehicleDocumentKey,
  type VehicleMasterFormState,
  type VehicleMasterRecord,
} from "@/types/vehicle-master";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import VehicleDocumentRow from "./vehicle-document-row";
import VehicleProfileCard, {
  getVehicleRenewalSummary,
} from "./vehicle-profile-card";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  UniversalMasterListActionsCell,
  UniversalMasterListNameCell,
  UniversalMasterListRow,
  UniversalMasterListShell,
  UniversalMasterListTable,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "edit" | "detail";

const DOCUMENT_KEYS = Object.keys(VEHICLE_DOCUMENT_LABELS) as VehicleDocumentKey[];

export default function VehiclesManagementMasterPanel() {
  const { vehicles, isReady, addVehicle, updateVehicle, removeVehicle } = useVehiclesMaster();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleMasterFormState>(EMPTY_VEHICLE_MASTER_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => vehicles.find((row) => row.id === viewingId) ?? null,
    [vehicles, viewingId]
  );

  const filtered = useMemo(
    () =>
      vehicles.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.vehicleName, [
          row.registrationNumber,
          row.model,
          row.ownerDetails,
        ])
      ),
    [vehicles, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_VEHICLE_MASTER_FORM);
    setEditingId(null);
    setError(null);
  };

  const openEdit = (record: VehicleMasterRecord) => {
    setEditingId(record.id);
    setForm({
      vehicleName: record.vehicleName,
      registrationNumber: record.registrationNumber,
      model: record.model,
      ownerDetails: record.ownerDetails,
      documents: record.documents,
    });
    setView("edit");
  };

  const handleSave = () => {
    const validationError = validateVehicleMasterForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (view === "edit" && editingId) {
      updateVehicle(editingId, form);
    } else {
      addVehicle(form);
    }
    resetForm();
    setView("list");
  };

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Vehicle"
      active={view === "add" ? "add" : "list"}
      onList={() => {
        resetForm();
        setViewingId(null);
        setView("list");
      }}
      onAdd={() => {
        resetForm();
        setView("add");
      }}
    />
  );

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading Vehicles Master...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <VehicleProfileCard
          record={viewingRecord}
          onBack={() => {
            setViewingId(null);
            setView("list");
          }}
          onEdit={() => openEdit(viewingRecord)}
        />
      </>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <>
        {tabBar}
        <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              {view === "add" ? "Add Vehicle" : "Edit Vehicle"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Compliance tracker — permits, tax, insurance, and document uploads.
            </p>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Vehicle Name"
              required
              value={form.vehicleName}
              onChange={(e) => setForm((p) => ({ ...p, vehicleName: e.target.value }))}
            />
            <TextInput
              label="Registration Number"
              required
              value={form.registrationNumber}
              onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))}
            />
            <TextInput
              label="Model"
              value={form.model}
              onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
            />
            <TextInput
              label="Owner Details"
              value={form.ownerDetails}
              onChange={(e) => setForm((p) => ({ ...p, ownerDetails: e.target.value }))}
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-corporate-text">
              Document Expiry & Attachments
            </h3>
            {DOCUMENT_KEYS.map((key) => (
              <VehicleDocumentRow
                key={key}
                docKey={key}
                block={form.documents[key]}
                onChange={(next) =>
                  setForm((p) => ({
                    ...p,
                    documents: { ...p.documents, [key]: next },
                  }))
                }
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Vehicle
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("list");
              }}
              className="rounded-lg border border-corporate-border px-4 py-2 text-sm"
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
        moduleName="Vehicle"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Vehicles Master List"
        subtitle="Fleet registry with compliance expiry tracking and renewal indicators."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Vehicle</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Registration</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Model</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Compliance</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Car className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  {searchQuery.trim() ? LIST_SEARCH_EMPTY_MESSAGE : "No vehicles yet."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={row.vehicleName}
                    onEdit={() => openEdit(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.registrationNumber}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.model || "—"}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {getVehicleRenewalSummary(row)}
                  </td>
                  <UniversalMasterListActionsCell>
                    <ModuleListActionGroup
                      onView={() => {
                        setViewingId(row.id);
                        setView("detail");
                      }}
                      onEdit={() => openEdit(row)}
                      extra={
                        <MasterRemoveOrProtected
                          canRemove={
                            !checkUsedInTransactions("vehicle", row.id, row.vehicleName)
                          }
                          onRemove={() => {
                            if (!window.confirm(`Remove vehicle "${row.vehicleName}"?`)) return;
                            removeVehicle(row.id);
                          }}
                        />
                      }
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
