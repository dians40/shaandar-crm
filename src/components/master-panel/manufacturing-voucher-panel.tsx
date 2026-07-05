"use client";

import { useCallback, useMemo, useState } from "react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useBomRecords } from "@/hooks/use-bom-records";
import { useManufacturingVouchers } from "@/hooks/use-manufacturing-vouchers";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import { formatChainAlternateOptionLabel } from "@/lib/item-unit-conversion";
import { applyManufacturingStock } from "@/lib/inventory-stock-ledger";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import { lockRawMaterialLines } from "@/types/bom";
import {
  emptyManufacturingVoucherForm,
  recordToManufacturingForm,
  scaleRawMaterialsForVolume,
  validateManufacturingVoucherForm,
  type ManufacturingVoucherFormState,
  type ManufacturingVoucherRecord,
} from "@/types/manufacturing-voucher";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import UniversalRecordProfile from "./universal-record-profile";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  UniversalMasterListNameCell,
  UniversalMasterListRow,
  UniversalMasterListShell,
  UniversalMasterListTable,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "detail";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ManufacturingVoucherPanel() {
  const { boms, isReady: bomsReady } = useBomRecords();
  const { conversions, isReady: conversionsReady } = useUnitConversions();
  const { units, isReady: unitsReady } = useUnits();
  const { records, isReady: vouchersReady, addVoucher } = useManufacturingVouchers();

  const [view, setView] = useState<ViewMode>("list");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<ManufacturingVoucherFormState>(emptyManufacturingVoucherForm);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isReady = bomsReady && conversionsReady && unitsReady && vouchersReady;

  const unitNameById = useMemo(
    () => Object.fromEntries(units.map((row) => [row.id, row.name])),
    [units]
  );

  const bomOptions = useMemo(
    () => boms.map((row) => ({ value: row.id, label: row.bomName })),
    [boms]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (row) =>
          matchesUniversalNameSearch(searchQuery, row.outputItemName) ||
          matchesUniversalNameSearch(searchQuery, row.productionRunId) ||
          matchesUniversalNameSearch(searchQuery, row.bomName)
      ),
    [records, searchQuery]
  );

  const viewingRecord = useMemo(
    () => records.find((row) => row.id === viewingId) ?? null,
    [records, viewingId]
  );

  const resetWorkspace = useCallback(() => {
    setView("list");
    setViewingId(null);
    setForm(emptyManufacturingVoucherForm());
    setError(null);
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetWorkspace);

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Manufacturing Voucher"
      active={view === "list" ? "list" : "add"}
      onAdd={() => {
        setForm(emptyManufacturingVoucherForm());
        setError(null);
        setView("add");
      }}
      onList={resetWorkspace}
    />
  );

  function applyBomSelection(bomId: string) {
    const bom = boms.find((row) => row.id === bomId);
    if (!bom) {
      setForm((prev) => ({ ...prev, bomId: "", bomName: "", rawMaterials: [], unitExpenses: [] }));
      return;
    }

    const conversion = conversions.find((row) => row.id === bom.outputUnitConversionId);
    const outputUnitFormula = conversion
      ? formatChainAlternateOptionLabel(conversion, unitNameById)
      : bom.outputUnitName;

    const lockedMaterials = lockRawMaterialLines(bom.rawMaterials);
    const scaledMaterials = scaleRawMaterialsForVolume(
      lockedMaterials,
      bom.outputQuantity,
      form.productionVolume || 1
    );

    setForm((prev) => ({
      ...prev,
      bomId,
      bomName: bom.bomName,
      outputItemId: bom.outputItemId,
      outputItemName: bom.outputItemName,
      outputQuantity: bom.outputQuantity,
      outputUnitName: bom.outputUnitName,
      outputUnitFormula,
      rawMaterials: scaledMaterials,
      unitExpenses: bom.unitExpenses,
    }));
  }

  function handleProductionVolumeChange(volume: number) {
    const bom = boms.find((row) => row.id === form.bomId);
    if (!bom) {
      setForm((prev) => ({ ...prev, productionVolume: volume }));
      return;
    }

    const lockedMaterials = lockRawMaterialLines(bom.rawMaterials);
    setForm((prev) => ({
      ...prev,
      productionVolume: volume,
      rawMaterials: scaleRawMaterialsForVolume(lockedMaterials, bom.outputQuantity, volume),
    }));
  }

  function handleSave() {
    const payload: ManufacturingVoucherFormState = {
      ...form,
      productionRunId:
        form.productionRunId.trim() || `MFG-${Date.now().toString().slice(-8)}`,
    };

    const validationError = validateManufacturingVoucherForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    addVoucher(payload);

    applyManufacturingStock(
      payload.rawMaterials.map((row) => ({ itemId: row.itemId, quantity: row.quantity })),
      payload.outputItemId,
      payload.productionVolume
    );

    resetWorkspace();
  }

  function openDetail(record: ManufacturingVoucherRecord) {
    setViewingId(record.id);
    setView("detail");
  }

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-6 text-sm text-corporate-muted">
        Loading Manufacturing Voucher…
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.outputItemName}
          subtitle={`Manufacturing · ${viewingRecord.productionRunId}`}
          fields={[
            { label: "Date", value: viewingRecord.productionDate },
            { label: "BOM Rule", value: viewingRecord.bomName },
            { label: "Output Unit Formula", value: viewingRecord.outputUnitFormula },
            { label: "Production Volume", value: viewingRecord.productionVolume },
            { label: "Unit Expense Total", value: formatCurrency(viewingRecord.totalUnitExpense) },
          ]}
          onBack={() => {
            setViewingId(null);
            setView("list");
          }}
          onEdit={() => {
            setForm(recordToManufacturingForm(viewingRecord));
            setView("add");
          }}
        />
      </>
    );
  }

  if (view === "add") {
    const totalUnitExpense = form.unitExpenses.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0
    );

    return (
      <>
        {tabBar}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextInput
              label="Production / Manufacturing Run ID"
              value={form.productionRunId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productionRunId: event.target.value }))
              }
              placeholder="Auto: MFG-…"
            />
            <TextInput
              label="Date"
              type="date"
              value={form.productionDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productionDate: event.target.value }))
              }
            />
            <SelectInput
              label="BOM Rule"
              value={form.bomId}
              onChange={(event) => applyBomSelection(event.target.value)}
              options={bomOptions}
              placeholder="Select BOM"
            />
            <TextInput
              label="Production Volume"
              type="number"
              min={0}
              step="any"
              value={form.productionVolume || ""}
              onChange={(event) =>
                handleProductionVolumeChange(Number(event.target.value) || 0)
              }
              disabled={!form.bomId}
            />
          </div>

          {form.bomId && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-corporate-text">
                  Raw Materials Consumed
                </h3>
                <div className="overflow-x-auto rounded-xl border border-corporate-border">
                  <table className="min-w-full text-sm">
                    <thead className={MASTER_LIST_HEAD_CLASS}>
                      <tr>
                        <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
                        <th className={MASTER_LIST_HEADER_CELL_CLASS}>Unit</th>
                        <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Quantity</th>
                        <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.rawMaterials.map((row) => (
                        <tr key={row.id} className="border-t border-corporate-border">
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.itemName}</td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.unitName}</td>
                          <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right`}>
                            {row.quantity}
                          </td>
                          <td className={MASTER_LIST_BODY_CELL_CLASS}>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              Locked
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h3 className="text-sm font-semibold text-emerald-900">
                  Finished Product Output
                </h3>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-corporate-muted">Target Item:</span>{" "}
                    {form.outputItemName}
                  </p>
                  <p>
                    <span className="text-corporate-muted">Output Unit Formula:</span>{" "}
                    {form.outputUnitFormula || form.outputUnitName}
                  </p>
                  <p>
                    <span className="text-corporate-muted">Production Volume:</span>{" "}
                    {form.productionVolume}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-corporate-border bg-corporate-surface/40 p-4">
                <h3 className="text-sm font-semibold text-corporate-text">Unit Expense Summary</h3>
                <div className="mt-2 space-y-1 text-sm">
                  {form.unitExpenses.map((row) => (
                    <div key={row.id} className="flex justify-between gap-4">
                      <span>{row.label || "Expense"}</span>
                      <span className="font-medium">{formatCurrency(row.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 border-t border-corporate-border pt-2 font-semibold">
                    <span>Total Unit Expense</span>
                    <span>{formatCurrency(totalUnitExpense)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-corporate-brand px-6 py-2 text-sm font-semibold text-white"
            >
              Save Manufacturing Voucher
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
    );
  }

  return (
    <>
      {tabBar}
      <UniversalMasterListShell
        moduleName="Manufacturing Voucher"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {filteredRecords.length === 0 ? (
          <p className="rounded-xl border border-corporate-border bg-white px-4 py-8 text-center text-sm text-corporate-muted">
            {LIST_SEARCH_EMPTY_MESSAGE}
          </p>
        ) : (
          <UniversalMasterListTable>
            <thead className={MASTER_LIST_HEAD_CLASS}>
              <tr>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Product Name</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Run ID</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>BOM</th>
                <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openDetail(row)}>
                  <UniversalMasterListNameCell
                    name={row.outputItemName}
                    onEdit={() => openDetail(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.productionRunId}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.productionDate}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.bomName}</td>
                  <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right`}>
                    {row.productionVolume}
                  </td>
                </UniversalMasterListRow>
              ))}
            </tbody>
          </UniversalMasterListTable>
        )}
      </UniversalMasterListShell>
    </>
  );
}
