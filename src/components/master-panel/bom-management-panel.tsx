"use client";

import { useMemo, useState } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { SelectInput, TextInput, ToggleInput } from "@/components/forms/form-fields";
import { formatUnitLabel } from "@/constants/units";
import { useBomRecords } from "@/hooks/use-bom-records";
import { useItems } from "@/hooks/use-items";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useUnits } from "@/hooks/use-units";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  EMPTY_BOM_BYPRODUCT_LINE,
  EMPTY_BOM_FORM,
  EMPTY_BOM_RAW_LINE,
  validateBomForm,
  type BomByProductLine,
  type BomFormState,
  type BomRawMaterialLine,
  type BomRecord,
} from "@/types/bom";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import UniversalRecordProfile from "./universal-record-profile";
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

export default function BomManagementPanel() {
  const { boms, isReady, addBom, updateBom, removeBom } = useBomRecords();
  const { items, isReady: itemsReady } = useItems();
  const { units, isReady: unitsReady } = useUnits();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BomFormState>(EMPTY_BOM_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => boms.find((row) => row.id === viewingId) ?? null,
    [boms, viewingId]
  );

  const itemOptions = useMemo(
    () => items.map((item) => ({ value: item.id, label: item.itemName })),
    [items]
  );

  const unitOptions = useMemo(
    () => units.map((unit) => ({ value: unit.id, label: formatUnitLabel(unit) })),
    [units]
  );

  const filtered = useMemo(
    () =>
      boms.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.bomName, [
          row.outputItemName,
          String(row.outputQuantity),
          row.outputUnitName,
        ])
      ),
    [boms, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_BOM_FORM);
    setEditingId(null);
    setError(null);
  };

  const openEdit = (record: BomRecord) => {
    setEditingId(record.id);
    setForm({
      bomName: record.bomName,
      outputItemId: record.outputItemId,
      outputItemName: record.outputItemName,
      outputQuantity: record.outputQuantity,
      outputUnitId: record.outputUnitId,
      outputUnitName: record.outputUnitName,
      unitExpense: record.unitExpense,
      rawMaterials: record.rawMaterials,
      byProducts: record.byProducts,
    });
    setView("edit");
  };

  const handleOutputItemChange = (itemId: string) => {
    const item = items.find((row) => row.id === itemId);
    setForm((prev) => ({
      ...prev,
      outputItemId: itemId,
      outputItemName: item?.itemName ?? "",
      outputUnitId: item?.primaryUnitId ?? prev.outputUnitId,
      outputUnitName: item?.primaryUnitName ?? prev.outputUnitName,
    }));
  };

  const updateRawLine = (id: string, patch: Partial<BomRawMaterialLine>) => {
    setForm((prev) => ({
      ...prev,
      rawMaterials: prev.rawMaterials.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  };

  const updateByProductLine = (id: string, patch: Partial<BomByProductLine>) => {
    setForm((prev) => ({
      ...prev,
      byProducts: prev.byProducts.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  };

  const handleSave = () => {
    const validationError = validateBomForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (view === "edit" && editingId) {
      updateBom(editingId, form);
    } else {
      addBom(form);
    }
    resetForm();
    setView("list");
  };

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="BOM"
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

  if (!isReady || !itemsReady || !unitsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading BOM / Productions...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.bomName}
          subtitle={`Produces ${viewingRecord.outputItemName}`}
          fields={[
            {
              label: "Output",
              value: `${viewingRecord.outputQuantity} ${viewingRecord.outputUnitName}`,
            },
            {
              label: "Unit Expense",
              value: `₹${viewingRecord.unitExpense.toLocaleString("en-IN")} (costing only)`,
            },
            { label: "Raw Materials", value: viewingRecord.rawMaterials.length },
            { label: "By-Products", value: viewingRecord.byProducts.length },
          ]}
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
              {view === "add" ? "Add BOM / Production" : "Edit BOM / Production"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Costing engine — raw materials, by-products, and operational overhead.
            </p>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="BOM / Production Name"
              required
              value={form.bomName}
              onChange={(e) => setForm((p) => ({ ...p, bomName: e.target.value }))}
            />
            <SelectInput
              label="Item to Produce"
              required
              value={form.outputItemId}
              placeholder="Select finished item"
              options={itemOptions}
              onChange={(e) => handleOutputItemChange(e.target.value)}
            />
            <TextInput
              label="Output Quantity"
              type="number"
              min="0.0001"
              step="any"
              value={String(form.outputQuantity)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  outputQuantity: Number(e.target.value) || 0,
                }))
              }
            />
            <SelectInput
              label="Output Unit"
              required
              value={form.outputUnitId}
              options={unitOptions}
              onChange={(e) => {
                const unit = units.find((row) => row.id === e.target.value);
                setForm((p) => ({
                  ...p,
                  outputUnitId: e.target.value,
                  outputUnitName: unit?.name ?? "",
                }));
              }}
            />
          </div>
          <TextInput
            label="Unit Expense"
            type="number"
            min="0"
            step="0.01"
            value={String(form.unitExpense)}
            onChange={(e) =>
              setForm((p) => ({ ...p, unitExpense: Number(e.target.value) || 0 }))
            }
            hint="Used for costing calculations only — does not affect general ledger."
          />

          <div className="space-y-3 rounded-lg border border-corporate-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-corporate-text">Raw Materials</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    rawMaterials: [...p.rawMaterials, EMPTY_BOM_RAW_LINE()],
                  }))
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-corporate-brand"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>
            {form.rawMaterials.length === 0 ? (
              <p className="text-xs text-corporate-muted">No raw material rows yet.</p>
            ) : (
              form.rawMaterials.map((line) => (
                <div key={line.id} className="grid gap-2 rounded-md bg-corporate-bg/50 p-3 sm:grid-cols-4">
                  <SelectInput
                    label="Raw Item"
                    value={line.itemId}
                    options={itemOptions}
                    onChange={(e) => {
                      const item = items.find((row) => row.id === e.target.value);
                      updateRawLine(line.id, {
                        itemId: e.target.value,
                        itemName: item?.itemName ?? "",
                        unitId: item?.primaryUnitId ?? "",
                        unitName: item?.primaryUnitName ?? "",
                      });
                    }}
                  />
                  <TextInput
                    label="Qty Consumed"
                    type="number"
                    min="0"
                    step="any"
                    value={String(line.quantity)}
                    onChange={(e) =>
                      updateRawLine(line.id, { quantity: Number(e.target.value) || 0 })
                    }
                  />
                  <SelectInput
                    label="Unit"
                    value={line.unitId}
                    options={unitOptions}
                    onChange={(e) => {
                      const unit = units.find((row) => row.id === e.target.value);
                      updateRawLine(line.id, {
                        unitId: e.target.value,
                        unitName: unit?.name ?? "",
                      });
                    }}
                  />
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          rawMaterials: p.rawMaterials.filter((row) => row.id !== line.id),
                        }))
                      }
                      className="inline-flex items-center gap-1 text-xs text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-corporate-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-corporate-text">By-Products</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    byProducts: [...p.byProducts, EMPTY_BOM_BYPRODUCT_LINE()],
                  }))
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-corporate-brand"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>
            {form.byProducts.length === 0 ? (
              <p className="text-xs text-corporate-muted">No by-product rows yet.</p>
            ) : (
              form.byProducts.map((line) => (
                <div key={line.id} className="space-y-2 rounded-md bg-corporate-bg/50 p-3">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <SelectInput
                      label="By-Product Item"
                      value={line.itemId}
                      options={itemOptions}
                      onChange={(e) => {
                        const item = items.find((row) => row.id === e.target.value);
                        updateByProductLine(line.id, {
                          itemId: e.target.value,
                          itemName: item?.itemName ?? "",
                          unitId: item?.primaryUnitId ?? "",
                          unitName: item?.primaryUnitName ?? "",
                        });
                      }}
                    />
                    <TextInput
                      label="Quantity"
                      type="number"
                      min="0"
                      step="any"
                      value={String(line.quantity)}
                      onChange={(e) =>
                        updateByProductLine(line.id, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <SelectInput
                      label="Unit"
                      value={line.unitId}
                      options={unitOptions}
                      onChange={(e) => {
                        const unit = units.find((row) => row.id === e.target.value);
                        updateByProductLine(line.id, {
                          unitId: e.target.value,
                          unitName: unit?.name ?? "",
                        });
                      }}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            byProducts: p.byProducts.filter((row) => row.id !== line.id),
                          }))
                        }
                        className="inline-flex items-center gap-1 text-xs text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <ToggleInput
                    label="Show Value"
                    description="Enable to capture by-product recovery value"
                    checked={line.showValue}
                    onChange={(checked) => updateByProductLine(line.id, { showValue: checked })}
                  />
                  {line.showValue && (
                    <TextInput
                      label="By-Product Value / Rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(line.valueRate)}
                      onChange={(e) =>
                        updateByProductLine(line.id, {
                          valueRate: Number(e.target.value) || 0,
                        })
                      }
                    />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save BOM
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
        moduleName="BOM"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="BOM / Productions List"
        subtitle="Bill of materials with raw material grids and by-product costing."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>BOM Name</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Output Item</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Output Qty</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Unit Expense</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Layers className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  {searchQuery.trim() ? LIST_SEARCH_EMPTY_MESSAGE : "No BOM records yet."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={row.bomName}
                    onEdit={() => openEdit(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.outputItemName}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {row.outputQuantity} {row.outputUnitName}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    ₹{row.unitExpense.toLocaleString("en-IN")}
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
                            !checkUsedInTransactions("bom", row.id, row.bomName)
                          }
                          onRemove={() => {
                            if (!window.confirm(`Remove BOM "${row.bomName}"?`)) return;
                            removeBom(row.id);
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
