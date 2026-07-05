"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { usePreventiveMaintenance } from "@/hooks/use-preventive-maintenance";
import { useVehiclesMaster } from "@/hooks/use-vehicles-master";
import { buildPreventiveAlerts } from "@/lib/preventive-maintenance-alerts";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import { cn } from "@/lib/utils";
import {
  LIFESPAN_DURATION_OPTIONS,
  createEmptyComponentLine,
  emptyPreventiveMaintenanceForm,
  validatePreventiveMaintenanceForm,
  type MaintenanceComponentLine,
  type PreventiveMaintenanceFormState,
} from "@/types/preventive-maintenance";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import UniversalRecordProfile from "./universal-record-profile";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  UniversalMasterListNameCell,
  UniversalMasterListRow,
  UniversalMasterListShell,
  UniversalMasterListTable,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "detail";

function ensureTrailingComponent(lines: MaintenanceComponentLine[]): MaintenanceComponentLine[] {
  if (lines.length === 0) return [createEmptyComponentLine()];
  const last = lines[lines.length - 1];
  if (last.componentName.trim() && last.lifespanMonths > 0) {
    return [...lines, createEmptyComponentLine()];
  }
  return lines;
}

export default function PreventiveMaintenancePanel() {
  const { machineOptions, isReady: settingsReady } = useGeneralSettings();
  const { vehicles, isReady: vehiclesReady } = useVehiclesMaster();
  const { rules, isReady: rulesReady, addRule, updateRule } = usePreventiveMaintenance();

  const [view, setView] = useState<ViewMode>("list");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PreventiveMaintenanceFormState>(
    emptyPreventiveMaintenanceForm
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeAlerts = useMemo(() => {
    const alerts = rules.flatMap((rule) =>
      buildPreventiveAlerts(rule.targetName, rule.components)
    );
    return alerts;
  }, [rules]);

  const machineTargetOptions = machineOptions;

  const vehicleTargetOptions = useMemo(
    () =>
      vehicles.map((row) => ({
        value: row.id,
        label: row.registrationNumber,
      })),
    [vehicles]
  );

  const targetOptions =
    form.targetType === "vehicle" ? vehicleTargetOptions : machineTargetOptions;

  const targetNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of machineOptions) map[row.value] = row.label;
    for (const row of vehicles) map[row.id] = row.registrationNumber;
    return map;
  }, [machineOptions, vehicles]);

  const filteredRules = useMemo(
    () =>
      rules.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.targetName, [
          row.targetType,
          ...row.components.map((c) => c.componentName),
        ])
      ),
    [rules, searchQuery]
  );

  const viewingRecord = useMemo(
    () => rules.find((row) => row.id === viewingId) ?? null,
    [rules, viewingId]
  );

  const resetWorkspace = useCallback(() => {
    setView("list");
    setViewingId(null);
    setEditingId(null);
    setForm(emptyPreventiveMaintenanceForm());
    setError(null);
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetWorkspace);

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Preventive Maintenance"
      active={view === "list" ? "list" : "add"}
      onAdd={() => {
        setEditingId(null);
        setForm(emptyPreventiveMaintenanceForm());
        setError(null);
        setView("add");
      }}
      onList={resetWorkspace}
    />
  );

  function updateComponent(index: number, patch: Partial<MaintenanceComponentLine>) {
    setForm((prev) => {
      const next = prev.components.map((row, idx) =>
        idx === index ? { ...row, ...patch } : row
      );
      return { ...prev, components: ensureTrailingComponent(next) };
    });
  }

  function handleSave() {
    const payload: PreventiveMaintenanceFormState = {
      ...form,
      targetName: targetNameMap[form.targetId] ?? form.targetName,
      components: form.components.filter((row) => row.componentName.trim()),
    };

    const validationError = validatePreventiveMaintenanceForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (editingId) updateRule(editingId, payload);
    else addRule(payload);
    resetWorkspace();
  }

  if (!settingsReady || !vehiclesReady || !rulesReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-6 text-sm text-corporate-muted">
        Loading Preventive Maintenance…
      </div>
    );
  }

  return (
    <>
      {tabBar}

      {activeAlerts.length > 0 && (
        <div className="mb-4 space-y-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-semibold">Preventive Maintenance Intimation (7–10 days before due)</p>
          </div>
          {activeAlerts.map((alert) => (
            <p key={alert.componentId} className="text-sm text-amber-800">
              <strong>{alert.targetName}</strong> — {alert.componentName} due on {alert.dueDate}{" "}
              ({alert.daysUntilDue} days remaining). Schedule check or replacement now.
            </p>
          ))}
        </div>
      )}

      {view === "detail" && viewingRecord ? (
        <UniversalRecordProfile
          title={viewingRecord.targetName}
          subtitle={`Preventive Maintenance · ${viewingRecord.targetType === "vehicle" ? "Vehicle" : "Machine"}`}
          fields={viewingRecord.components.map((row) => ({
            label: row.componentName,
            value: `Last replaced ${row.lastReplacedDate} · Lifespan ${row.lifespanMonths} month(s)`,
          }))}
          onBack={() => {
            setViewingId(null);
            setView("list");
          }}
          onEdit={() => {
            setEditingId(viewingRecord.id);
            setForm({
              targetType: viewingRecord.targetType,
              targetId: viewingRecord.targetId,
              targetName: viewingRecord.targetName,
              components: viewingRecord.components,
            });
            setView("add");
          }}
        />
      ) : view === "add" ? (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-corporate-text">Target Assignment</p>
              <div className="flex flex-wrap gap-2">
                {(["machine", "vehicle"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        targetType: type,
                        targetId: "",
                        targetName: "",
                      }))
                    }
                    className={cn(
                      "rounded-full border px-5 py-2 text-sm font-semibold capitalize",
                      form.targetType === type
                        ? "border-corporate-brand bg-corporate-brand text-white"
                        : "border-corporate-border bg-white"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <SelectInput
              label={form.targetType === "vehicle" ? "Vehicle" : "Machine"}
              value={form.targetId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  targetId: event.target.value,
                  targetName: targetNameMap[event.target.value] ?? "",
                }))
              }
              options={targetOptions}
              placeholder={`Select ${form.targetType}`}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-corporate-text">
                  Lifespan Interval Components
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      components: [...prev.components, createEmptyComponentLine()],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Component
                </button>
              </div>

              <div className="workspace-table-scroll rounded-xl border border-corporate-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-corporate-surface text-left text-xs uppercase text-corporate-muted">
                    <tr>
                      <th className="px-3 py-2">Component Name</th>
                      <th className="px-3 py-2">Lifespan Duration</th>
                      <th className="px-3 py-2">Last Replaced Date</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.components.map((line, index) => (
                      <tr key={line.id} className="border-t border-corporate-border align-top">
                        <td className="min-w-[160px] px-3 py-2">
                          <TextInput
                            label=""
                            value={line.componentName}
                            onChange={(event) =>
                              updateComponent(index, { componentName: event.target.value })
                            }
                            placeholder="e.g. Engine Oil"
                          />
                        </td>
                        <td className="min-w-[140px] px-3 py-2">
                          <SelectInput
                            label=""
                            value={String(line.lifespanMonths)}
                            onChange={(event) =>
                              updateComponent(index, {
                                lifespanMonths: Number(event.target.value) || 6,
                              })
                            }
                            options={LIFESPAN_DURATION_OPTIONS.map((row) => ({
                              value: row.value,
                              label: row.label,
                            }))}
                          />
                        </td>
                        <td className="min-w-[140px] px-3 py-2">
                          <TextInput
                            label=""
                            type="date"
                            value={line.lastReplacedDate}
                            onChange={(event) =>
                              updateComponent(index, { lastReplacedDate: event.target.value })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                components:
                                  prev.components.length <= 1
                                    ? [createEmptyComponentLine()]
                                    : prev.components.filter((_, idx) => idx !== index),
                              }))
                            }
                            className="rounded-full p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-corporate-brand px-6 py-2 text-sm font-semibold text-white"
              >
                Save Maintenance Rule
              </button>
              <button
                type="button"
                onClick={resetWorkspace}
                className="rounded-full border border-corporate-border px-6 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : (
        <UniversalMasterListShell
          moduleName="Preventive Maintenance"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        >
          {filteredRules.length === 0 ? (
            <p className="rounded-xl border border-corporate-border bg-white px-4 py-8 text-center text-sm text-corporate-muted">
              {LIST_SEARCH_EMPTY_MESSAGE}
            </p>
          ) : (
            <UniversalMasterListTable>
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Target Name</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Type</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Components</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((row) => (
                  <UniversalMasterListRow
                    key={row.id}
                    onEdit={() => {
                      setViewingId(row.id);
                      setView("detail");
                    }}
                  >
                    <UniversalMasterListNameCell
                      name={row.targetName}
                      onEdit={() => {
                        setViewingId(row.id);
                        setView("detail");
                      }}
                    />
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>
                      {row.targetType === "vehicle" ? "Vehicle" : "Machine"}
                    </td>
                    <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.components.length}</td>
                  </UniversalMasterListRow>
                ))}
              </tbody>
            </UniversalMasterListTable>
          )}
        </UniversalMasterListShell>
      )}
    </>
  );
}
