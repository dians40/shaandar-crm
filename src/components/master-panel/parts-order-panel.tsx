"use client";

import { useCallback, useMemo, useState } from "react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { useEmployees } from "@/hooks/use-employees";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { useGodowns } from "@/hooks/use-godowns";
import { useItems } from "@/hooks/use-items";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { usePartsOrderRecords } from "@/hooks/use-parts-order-records";
import { useVehiclesMaster } from "@/hooks/use-vehicles-master";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import { cn } from "@/lib/utils";
import {
  EMPTY_PARTS_ORDER_FORM,
  PARTS_ORDER_STAGE_LABELS,
  validateHoDispatchForm,
  validateOperatorRequestForm,
  validateRepairLogForm,
  type PartsOrderFormState,
  type PartsOrderRecord,
  type PartsOrderStage,
} from "@/types/parts-order-workflow";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import PreventiveMaintenancePanel from "./preventive-maintenance-panel";
import PartsOrderStagePills from "./shared/parts-order-stage-pills";
import SinglePhotoUploader from "./shared/single-photo-uploader";
import {
  UniversalMasterListShell,
  useMasterListFilters,
} from "./universal-master-list";

type WorkspaceTab = "parts-order" | "preventive-maintenance";
type ViewMode = "list" | "add";

const PARTS_ITEM_OTHER = "__other_part__";

export default function PartsOrderPanel() {
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { machineOptions, isReady: settingsReady } = useGeneralSettings();
  const { items, isReady: itemsReady } = useItems();
  const { godowns, isReady: godownsReady } = useGodowns();
  const { vehicles, isReady: vehiclesReady } = useVehiclesMaster();
  const { records, isReady: recordsReady, addRecord, updateRecord } = usePartsOrderRecords();

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("parts-order");
  const [activeStage, setActiveStage] = useState<PartsOrderStage>("operator_request");
  const [view, setView] = useState<ViewMode>("list");
  const [form, setForm] = useState<PartsOrderFormState>(EMPTY_PARTS_ORDER_FORM);
  const [customPartName, setCustomPartName] = useState("");
  const [partItemSelect, setPartItemSelect] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isReady =
    !employeesLoading && settingsReady && itemsReady && godownsReady && vehiclesReady && recordsReady;

  const employeeOptions = useMemo(
    () =>
      employees.map((row) => ({
        value: row.id,
        label: row.name,
      })),
    [employees]
  );

  const machineSelectOptions = machineOptions;

  const partsItemOptions = useMemo(
    () => [
      ...items.map((row) => ({ value: row.itemName, label: row.itemName })),
      { value: PARTS_ITEM_OTHER, label: "Other (custom text)" },
    ],
    [items]
  );

  const destinationOptions = useMemo(
    () =>
      godowns
        .filter((row) => row.isActive)
        .map((row) => ({ value: row.id, label: row.name })),
    [godowns]
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((row) => ({
        value: row.id,
        label: row.registrationNumber,
      })),
    [vehicles]
  );

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<PartsOrderStage, number>> = {};
    for (const row of records) {
      counts[row.workflowStage] = (counts[row.workflowStage] ?? 0) + 1;
    }
    return counts;
  }, [records]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (row) =>
          row.workflowStage === activeStage &&
          matchesUniversalNameSearch(searchQuery, row.operatorEmployeeName, [
            row.orderNumber,
            row.machineName,
            row.partsItemNeeded,
          ])
      ),
    [records, activeStage, searchQuery]
  );

  const resetPanelState = useCallback(() => {
    setActiveStage("operator_request");
    setView("list");
    setForm(EMPTY_PARTS_ORDER_FORM);
    setCustomPartName("");
    setPartItemSelect("");
    setError(null);
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

  const workspacePills = (
    <div className="mb-4 flex flex-wrap gap-2">
      {(
        [
          { id: "parts-order" as const, label: "Parts Order Workflow" },
          { id: "preventive-maintenance" as const, label: "Preventive Maintenance" },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setWorkspaceTab(tab.id)}
          className={cn(
            "rounded-full border px-5 py-2 text-sm font-semibold",
            workspaceTab === tab.id
              ? "border-corporate-brand bg-corporate-brand text-white"
              : "border-corporate-border bg-white"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  function openAddRequest() {
    setForm(EMPTY_PARTS_ORDER_FORM);
    setCustomPartName("");
    setPartItemSelect("");
    setError(null);
    setView("add");
  }

  function handleSubmitOperatorRequest() {
    const partsItemNeeded =
      partItemSelect === PARTS_ITEM_OTHER ? customPartName.trim() : partItemSelect;

    const payload: PartsOrderFormState = {
      ...form,
      partsItemNeeded,
      orderNumber: form.orderNumber.trim() || `PO-${Date.now().toString().slice(-8)}`,
      workflowStage: "supervisor_verification",
    };

    const validationError = validateOperatorRequestForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    addRecord(payload);
    resetPanelState();
    setActiveStage("supervisor_verification");
  }

  function handleSupervisorAuthorize(record: PartsOrderRecord) {
    updateRecord(record.id, {
      workflowStage: "ho_transit_dispatch",
      supervisorVerifiedAt: new Date().toISOString(),
      supervisorVerifiedBy: "Supervisor / Manager",
    });
  }

  function handleHoDispatch(record: PartsOrderRecord, draft: PartsOrderFormState) {
    const validationError = validateHoDispatchForm(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    updateRecord(record.id, {
      ...draft,
      workflowStage: "factory_receipt",
      transitStatus: "due_in_transit",
    });
    setError(null);
  }

  function handleMarkReceived(record: PartsOrderRecord) {
    updateRecord(record.id, {
      workflowStage: "repair_logs",
      transitStatus: "received",
      receivedAt: new Date().toISOString(),
      receivedBy: "Factory Manager",
    });
  }

  function handleCompleteRepairLog(record: PartsOrderRecord, draft: PartsOrderFormState) {
    const validationError = validateRepairLogForm(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    updateRecord(record.id, {
      ...draft,
      transitStatus: "completed",
    });
    setError(null);
  }

  if (workspaceTab === "preventive-maintenance") {
    return (
      <>
        {workspacePills}
        <PreventiveMaintenancePanel />
      </>
    );
  }

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-6 text-sm text-corporate-muted">
        Loading Parts Order…
      </div>
    );
  }

  if (view === "add") {
    return (
      <>
        {workspacePills}
        <ModuleAddListTabBar
          moduleName="Parts Order"
          active="add"
          onAdd={openAddRequest}
          onList={resetPanelState}
        />
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
          <h3 className="text-sm font-semibold text-corporate-text">
            Stage 1 · Operator Request Entry
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput
              label="Operator Employee"
              value={form.operatorEmployeeId}
              onChange={(event) => {
                const employee = employees.find((row) => row.id === event.target.value);
                setForm((prev) => ({
                  ...prev,
                  operatorEmployeeId: event.target.value,
                  operatorEmployeeName: employee?.name ?? "",
                }));
              }}
              options={employeeOptions}
              placeholder="Select operator"
            />
            <SelectInput
              label="Machine"
              value={form.machineName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, machineName: event.target.value }))
              }
              options={machineSelectOptions}
              placeholder="Select machine"
            />
            <SelectInput
              label="Parts Item Needed"
              value={partItemSelect}
              onChange={(event) => setPartItemSelect(event.target.value)}
              options={partsItemOptions}
              placeholder="Select or choose other"
            />
            {partItemSelect === PARTS_ITEM_OTHER && (
              <TextInput
                label="Custom Part Name"
                value={customPartName}
                onChange={(event) => setCustomPartName(event.target.value)}
              />
            )}
          </div>

          <SinglePhotoUploader
            label="Mandatory Part Photo"
            photo={form.partPhoto}
            onChange={(photo) => setForm((prev) => ({ ...prev, partPhoto: photo }))}
            required
          />

          <button
            type="button"
            onClick={handleSubmitOperatorRequest}
            className="rounded-full bg-corporate-brand px-6 py-2 text-sm font-semibold text-white"
          >
            Submit for Supervisor Review
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {workspacePills}
      <ModuleAddListTabBar
        moduleName="Parts Order"
        active="list"
        onAdd={openAddRequest}
        onList={() => setView("list")}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="workspace-panel-stack">
        <PartsOrderStagePills
          activeStage={activeStage}
          onChange={(stage) => {
            setActiveStage(stage);
            setError(null);
          }}
          counts={stageCounts}
        />

        <div className="space-y-4">
          <p className="text-sm text-corporate-muted">{PARTS_ORDER_STAGE_LABELS[activeStage]}</p>

          <UniversalMasterListShell
            moduleName="Parts Order"
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          >
            {filteredRecords.length === 0 ? (
              <p className="rounded-xl border border-corporate-border bg-white px-4 py-8 text-center text-sm text-corporate-muted">
                {LIST_SEARCH_EMPTY_MESSAGE}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <StageRecordCard
                    key={record.id}
                    record={record}
                    activeStage={activeStage}
                    destinationOptions={destinationOptions}
                    vehicleOptions={vehicleOptions}
                    godownMap={Object.fromEntries(godowns.map((g) => [g.id, g.name]))}
                    vehicleMap={Object.fromEntries(
                      vehicles.map((v) => [v.id, v.registrationNumber])
                    )}
                    onSupervisorAuthorize={() => handleSupervisorAuthorize(record)}
                    onHoDispatch={(draft) => handleHoDispatch(record, draft)}
                    onMarkReceived={() => handleMarkReceived(record)}
                    onCompleteRepair={(draft) => handleCompleteRepairLog(record, draft)}
                  />
                ))}
              </div>
            )}
          </UniversalMasterListShell>
        </div>
      </div>
    </>
  );
}

type StageCardProps = {
  record: PartsOrderRecord;
  activeStage: PartsOrderStage;
  destinationOptions: { value: string; label: string }[];
  vehicleOptions: { value: string; label: string }[];
  godownMap: Record<string, string>;
  vehicleMap: Record<string, string>;
  onSupervisorAuthorize: () => void;
  onHoDispatch: (draft: PartsOrderFormState) => void;
  onMarkReceived: () => void;
  onCompleteRepair: (draft: PartsOrderFormState) => void;
};

function StageRecordCard({
  record,
  activeStage,
  destinationOptions,
  vehicleOptions,
  godownMap,
  vehicleMap,
  onSupervisorAuthorize,
  onHoDispatch,
  onMarkReceived,
  onCompleteRepair,
}: StageCardProps) {
  const [dispatchDraft, setDispatchDraft] = useState<PartsOrderFormState>({
    ...EMPTY_PARTS_ORDER_FORM,
    sentToDestinationId: record.sentToDestinationId,
    sentToDestinationName: record.sentToDestinationName,
    vehicleDispatchedId: record.vehicleDispatchedId,
    vehicleRegistration: record.vehicleRegistration,
    transitWaybillPhoto: record.transitWaybillPhoto,
  });

  const [repairDraft, setRepairDraft] = useState<PartsOrderFormState>({
    ...EMPTY_PARTS_ORDER_FORM,
    repairDate: record.repairDate,
    actionTakenLog: record.actionTakenLog,
    nextPreventiveCheckDate: record.nextPreventiveCheckDate,
  });

  return (
    <div className="rounded-xl border border-corporate-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-corporate-text">{record.operatorEmployeeName}</p>
          <p className="text-sm text-corporate-muted">
            {record.orderNumber} · {record.machineName} · {record.partsItemNeeded}
          </p>
        </div>
        {record.transitStatus === "due_in_transit" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Status: DUE / IN TRANSIT
          </span>
        )}
        {record.transitStatus === "received" && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Arrival Confirmed
          </span>
        )}
      </div>

      {record.partPhoto && (
        <div className="mb-3 max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.partPhoto}
            alt="Part photo"
            className="h-28 w-full rounded-lg border object-cover"
          />
        </div>
      )}

      {activeStage === "supervisor_verification" && (
        <button
          type="button"
          onClick={onSupervisorAuthorize}
          className="rounded-full bg-corporate-brand px-5 py-2 text-sm font-semibold text-white"
        >
          Authorize & Forward to Head Office
        </button>
      )}

      {activeStage === "ho_transit_dispatch" && (
        <div className="space-y-3">
          <SelectInput
            label="Sent To Destination"
            value={dispatchDraft.sentToDestinationId}
            onChange={(event) =>
              setDispatchDraft((prev) => ({
                ...prev,
                sentToDestinationId: event.target.value,
                sentToDestinationName: godownMap[event.target.value] ?? "",
              }))
            }
            options={destinationOptions}
            placeholder="Select godown / shop"
          />
          <SelectInput
            label="Vehicle Dispatched Through"
            value={dispatchDraft.vehicleDispatchedId}
            onChange={(event) =>
              setDispatchDraft((prev) => ({
                ...prev,
                vehicleDispatchedId: event.target.value,
                vehicleRegistration: vehicleMap[event.target.value] ?? "",
              }))
            }
            options={vehicleOptions}
            placeholder="Select vehicle"
          />
          <SinglePhotoUploader
            label="Mandatory Transit Waybill Photo"
            photo={dispatchDraft.transitWaybillPhoto}
            onChange={(photo) =>
              setDispatchDraft((prev) => ({ ...prev, transitWaybillPhoto: photo }))
            }
            required
          />
          <button
            type="button"
            onClick={() => onHoDispatch(dispatchDraft)}
            className="rounded-full bg-corporate-brand px-5 py-2 text-sm font-semibold text-white"
          >
            Dispatch & Lock In Transit
          </button>
        </div>
      )}

      {activeStage === "factory_receipt" && (
        <div className="space-y-3">
          {record.transitWaybillPhoto && (
            <div className="max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.transitWaybillPhoto}
                alt="Waybill"
                className="h-28 w-full rounded-lg border object-cover"
              />
            </div>
          )}
          <p className="text-sm text-corporate-muted">
            Destination: {record.sentToDestinationName || "—"} · Vehicle:{" "}
            {record.vehicleRegistration || "—"}
          </p>
          <button
            type="button"
            onClick={onMarkReceived}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
          >
            Mark as Received
          </button>
        </div>
      )}

      {activeStage === "repair_logs" && (
        <div className="space-y-3">
          {record.receivedAt && (
            <p className="text-sm text-emerald-700">
              Factory receipt confirmed at {new Date(record.receivedAt).toLocaleString("en-IN")}
            </p>
          )}
          <TextInput
            label="Repair Date"
            type="date"
            value={repairDraft.repairDate}
            onChange={(event) =>
              setRepairDraft((prev) => ({ ...prev, repairDate: event.target.value }))
            }
          />
          <TextareaInput
            label="Action Taken Log"
            rows={3}
            value={repairDraft.actionTakenLog}
            onChange={(event) =>
              setRepairDraft((prev) => ({ ...prev, actionTakenLog: event.target.value }))
            }
          />
          <TextInput
            label="Next Preventive Checking / Change Date"
            type="date"
            value={repairDraft.nextPreventiveCheckDate}
            onChange={(event) =>
              setRepairDraft((prev) => ({
                ...prev,
                nextPreventiveCheckDate: event.target.value,
              }))
            }
          />
          <button
            type="button"
            onClick={() => onCompleteRepair(repairDraft)}
            className="rounded-full bg-corporate-brand px-5 py-2 text-sm font-semibold text-white"
          >
            Save Repair Log & Schedule
          </button>
        </div>
      )}

      {activeStage === "operator_request" && (
        <p className="text-sm text-corporate-muted">
          Pending operator submission. Use Add Parts Order to create a new request.
        </p>
      )}
    </div>
  );
}
