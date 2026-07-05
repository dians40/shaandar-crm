"use client";

import { useCallback, useMemo, useState } from "react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import type { InventoryVoucherPanelConfig } from "@/constants/inventory-voucher-configs";
import { useAccounts } from "@/hooks/use-accounts";
import { useBillOfSundries } from "@/hooks/use-bill-of-sundries";
import { useInventoryVouchers } from "@/hooks/use-inventory-vouchers";
import { useItems } from "@/hooks/use-items";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import {
  computeVoucherTotals,
  validateInventoryVoucherForm,
} from "@/lib/inventory-voucher-calculator";
import { applyInventoryVoucherToStock } from "@/lib/inventory-stock-ledger";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import {
  emptyInventoryVoucherForm,
  recordToInventoryVoucherForm,
  type InventoryVoucherFormState,
  type InventoryVoucherRecord,
} from "@/types/inventory-voucher";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import TransactionItemLinesGrid from "./shared/transaction-item-lines-grid";
import TransactionSundriesBlock from "./shared/transaction-sundries-block";
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

type ViewMode = "list" | "add" | "edit" | "detail";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  config: InventoryVoucherPanelConfig;
};

export default function InventoryVoucherPanel({ config }: Props) {
  const { accounts, isReady: accountsReady } = useAccounts();
  const { items, isReady: itemsReady } = useItems();
  const { sundries, isReady: sundriesReady } = useBillOfSundries();
  const { conversions, isReady: conversionsReady } = useUnitConversions();
  const { units, isReady: unitsReady } = useUnits();
  const { records, isReady: vouchersReady, addVoucher, updateVoucher } =
    useInventoryVouchers(config.kind);

  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryVoucherFormState>(() =>
    emptyInventoryVoucherForm(config.kind, [])
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isReady =
    accountsReady && itemsReady && sundriesReady && conversionsReady && unitsReady && vouchersReady;

  const unitNameById = useMemo(
    () => Object.fromEntries(units.map((row) => [row.id, row.name])),
    [units]
  );

  const itemMap = useMemo(
    () => Object.fromEntries(items.map((row) => [row.id, row])),
    [items]
  );

  const totals = useMemo(() => computeVoucherTotals(form), [form]);

  const partyOptions = useMemo(
    () =>
      accounts.map((row) => ({
        value: row.id,
        label: row.stationDestination.trim()
          ? `${row.name} — ${row.stationDestination}`
          : row.name,
      })),
    [accounts]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (row) =>
          matchesUniversalNameSearch(searchQuery, row.partyName) ||
          matchesUniversalNameSearch(searchQuery, row.voucherNumber) ||
          matchesUniversalNameSearch(searchQuery, row.destinationStation)
      ),
    [records, searchQuery]
  );

  const viewingRecord = useMemo(
    () => records.find((row) => row.id === viewingId) ?? null,
    [records, viewingId]
  );

  const resetWorkspace = useCallback(() => {
    setView("list");
    setEditingId(null);
    setViewingId(null);
    setForm(emptyInventoryVoucherForm(config.kind, sundries));
    setError(null);
    setSearchQuery("");
  }, [config.kind, sundries]);

  useMasterPanelBlockReset("transaction", resetWorkspace);

  const tabBar = (
    <ModuleAddListTabBar
      moduleName={config.moduleName}
      active={view === "list" ? "list" : "add"}
      onAdd={() => openAdd()}
      onList={resetWorkspace}
    />
  );

  function openAdd() {
    setEditingId(null);
    setViewingId(null);
    setForm(emptyInventoryVoucherForm(config.kind, sundries));
    setError(null);
    setView("add");
  }

  function openDetail(record: InventoryVoucherRecord) {
    setViewingId(record.id);
    setEditingId(null);
    setError(null);
    setView("detail");
  }

  function openEdit(record: InventoryVoucherRecord) {
    setViewingId(record.id);
    setEditingId(record.id);
    setForm(recordToInventoryVoucherForm(record));
    setError(null);
    setView("edit");
  }

  function handlePartyChange(partyAccountId: string) {
    const account = accounts.find((row) => row.id === partyAccountId);
    setForm((prev) => ({
      ...prev,
      partyAccountId,
      partyName: account?.name ?? "",
      destinationStation: account?.stationDestination ?? "",
    }));
  }

  function handleSave() {
    const payload: InventoryVoucherFormState = {
      ...form,
      voucherNumber:
        form.voucherNumber.trim() ||
        `${config.numberPrefix}-${Date.now().toString().slice(-8)}`,
    };

    const validationError = validateInventoryVoucherForm(payload, {
      isReturn: config.isReturn,
      voucherLabel: config.voucherLabel,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const computed = computeVoucherTotals(payload);
    const committedLines = computed.lines.filter((row) => row.itemId && row.quantity > 0);

    if (editingId) {
      updateVoucher(editingId, { ...payload, lines: committedLines });
    } else {
      addVoucher({ ...payload, lines: committedLines });
      applyInventoryVoucherToStock(config.kind, committedLines, itemMap, conversions);
    }

    resetWorkspace();
  }

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-6 text-sm text-corporate-muted">
        Loading {config.moduleName}…
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    const detailTotals = computeVoucherTotals(recordToInventoryVoucherForm(viewingRecord));
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.partyName}
          subtitle={`${config.moduleName} · ${viewingRecord.voucherNumber}`}
          fields={[
            { label: "Date", value: viewingRecord.voucherDate },
            { label: config.partyLabel, value: viewingRecord.partyName },
            { label: "Destination Station", value: viewingRecord.destinationStation || "—" },
            ...(config.isReturn
              ? [
                  { label: "Original Invoice Ref", value: viewingRecord.originalInvoiceRef },
                  { label: "Return Reason", value: viewingRecord.returnReason || "—" },
                ]
              : []),
            { label: "Items Subtotal", value: formatCurrency(detailTotals.itemsSubtotal) },
            { label: "Tax Total", value: formatCurrency(detailTotals.itemsTaxTotal) },
            { label: "Sundries Net", value: formatCurrency(detailTotals.sundriesNet) },
            { label: "Grand Total", value: formatCurrency(detailTotals.grandTotal) },
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
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextInput
              label={`${config.voucherLabel} Number`}
              value={form.voucherNumber}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, voucherNumber: event.target.value }))
              }
              placeholder={`Auto: ${config.numberPrefix}-…`}
            />
            <TextInput
              label="Date"
              type="date"
              value={form.voucherDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, voucherDate: event.target.value }))
              }
            />
            <SelectInput
              label={config.partyLabel}
              value={form.partyAccountId}
              onChange={(event) => handlePartyChange(event.target.value)}
              options={partyOptions}
              placeholder="Select party"
            />
            <TextInput
              label="Destination Station"
              value={form.destinationStation}
              readOnly
              placeholder="Auto from selected account"
            />
          </div>

          {config.isReturn && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Original Invoice Reference Number"
                value={form.originalInvoiceRef}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, originalInvoiceRef: event.target.value }))
                }
                required
              />
              <TextareaInput
                label="Return Reason / Narration"
                value={form.returnReason}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, returnReason: event.target.value }))
                }
                rows={2}
              />
            </div>
          )}

          <TransactionItemLinesGrid
            lines={form.lines}
            voucherKind={config.kind}
            items={items}
            conversions={conversions}
            unitNameById={unitNameById}
            onChange={(lines) => setForm((prev) => ({ ...prev, lines }))}
          />

          <TransactionSundriesBlock
            lines={form.sundryLines}
            itemsSubtotal={totals.itemsSubtotal}
            onChange={(sundryLines) => setForm((prev) => ({ ...prev, sundryLines }))}
          />

          <div className="grid gap-2 rounded-xl border border-corporate-border bg-corporate-brand/5 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Items Subtotal: {formatCurrency(totals.itemsSubtotal)}</p>
            <p>Tax Total: {formatCurrency(totals.itemsTaxTotal)}</p>
            <p>Sundries Net: {formatCurrency(totals.sundriesNet)}</p>
            <p className="text-base font-semibold text-corporate-brand">
              Grand Total: {formatCurrency(totals.grandTotal)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-corporate-brand px-6 py-2 text-sm font-semibold text-white"
            >
              {editingId ? "Update" : "Save"} {config.moduleName}
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
        moduleName={config.moduleName}
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
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>{config.partyLabel}</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>{config.voucherLabel} #</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Station</th>
                <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openDetail(row)}>
                  <UniversalMasterListNameCell
                    name={row.partyName}
                    onEdit={() => openDetail(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.voucherNumber}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.voucherDate}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {row.destinationStation || "—"}
                  </td>
                  <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right font-medium`}>
                    {formatCurrency(row.grandTotal)}
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
