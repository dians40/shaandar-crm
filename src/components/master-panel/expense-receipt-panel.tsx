"use client";

import { useCallback, useMemo, useState } from "react";
import { TextInput } from "@/components/forms/form-fields";
import type { ExpenseReceiptPanelConfig } from "@/constants/accounting-voucher-configs";
import { useAccounts } from "@/hooks/use-accounts";
import { useExpenseReceiptVouchers } from "@/hooks/use-expense-receipt-vouchers";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import {
  computeExpenseReceiptTotal,
  validateExpenseReceiptForm,
} from "@/lib/accounting-voucher-calculator";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import {
  emptyExpenseReceiptForm,
  type ExpenseReceiptFormState,
} from "@/types/accounting-voucher";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import LedgerPostingLinesGrid from "./shared/ledger-posting-lines-grid";
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
  useMasterListFilters,
} from "./universal-master-list";

type ViewMode = "list" | "add" | "edit" | "detail";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  config: ExpenseReceiptPanelConfig;
};

export default function ExpenseReceiptPanel({ config }: Props) {
  const { accounts, isReady: accountsReady } = useAccounts();
  const { records, isReady: vouchersReady, addVoucher, updateVoucher } =
    useExpenseReceiptVouchers(config.kind);

  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseReceiptFormState>(() =>
    emptyExpenseReceiptForm(config.kind)
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const accountOptions = useMemo(
    () => accounts.map((row) => ({ value: row.id, label: row.name })),
    [accounts]
  );

  const totalAmount = useMemo(() => computeExpenseReceiptTotal(form), [form]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (row) =>
          matchesUniversalNameSearch(searchQuery, row.partyDisplayName) ||
          matchesUniversalNameSearch(searchQuery, row.voucherNumber)
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
    setForm(emptyExpenseReceiptForm(config.kind));
    setError(null);
    setSearchQuery("");
  }, [config.kind]);

  useMasterPanelBlockReset("transaction", resetWorkspace);

  const tabBar = (
    <ModuleAddListTabBar
      moduleName={config.moduleName}
      active={view === "list" ? "list" : "add"}
      onAdd={() => {
        setEditingId(null);
        setForm(emptyExpenseReceiptForm(config.kind));
        setError(null);
        setView("add");
      }}
      onList={resetWorkspace}
    />
  );

  function handleSave() {
    const payload: ExpenseReceiptFormState = {
      ...form,
      voucherNumber:
        form.voucherNumber.trim() ||
        `${config.numberPrefix}-${Date.now().toString().slice(-8)}`,
      partyDisplayName:
        form.partyDisplayName.trim() ||
        form.lines.find((row) => row.accountDebitedName)?.accountDebitedName ||
        form.lines.find((row) => row.accountCreditedName)?.accountCreditedName ||
        config.moduleName,
      lines: form.lines.filter((row) => row.amount > 0),
    };

    const validationError = validateExpenseReceiptForm(payload, config.voucherLabel);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (editingId) updateVoucher(editingId, payload);
    else addVoucher(payload);
    resetWorkspace();
  }

  if (!accountsReady || !vouchersReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-6 text-sm text-corporate-muted">
        Loading {config.moduleName}…
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.partyDisplayName}
          subtitle={`${config.moduleName} · ${viewingRecord.voucherNumber}`}
          fields={[
            { label: "Date", value: viewingRecord.voucherDate },
            { label: "Total Amount", value: formatCurrency(viewingRecord.totalAmount) },
            {
              label: "Lines",
              value: `${viewingRecord.lines.length} posting line(s)`,
            },
          ]}
          onBack={() => {
            setViewingId(null);
            setView("list");
          }}
          onEdit={() => {
            setEditingId(viewingRecord.id);
            setForm({
              voucherKind: viewingRecord.voucherKind,
              voucherNumber: viewingRecord.voucherNumber,
              voucherDate: viewingRecord.voucherDate,
              partyDisplayName: viewingRecord.partyDisplayName,
              lines: viewingRecord.lines,
            });
            setView("edit");
          }}
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
            <TextInput
              label={config.partyLabel}
              value={form.partyDisplayName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, partyDisplayName: event.target.value }))
              }
            />
          </div>

          <LedgerPostingLinesGrid
            lines={form.lines}
            accounts={accountOptions}
            onChange={(lines) => setForm((prev) => ({ ...prev, lines }))}
          />

          <p className="text-base font-semibold text-corporate-brand">
            Total: {formatCurrency(totalAmount)}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-corporate-brand px-6 py-2 text-sm font-semibold text-white"
            >
              Save {config.moduleName}
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
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Voucher #</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((row) => (
                <UniversalMasterListRow
                  key={row.id}
                  onEdit={() => {
                    setViewingId(row.id);
                    setView("detail");
                  }}
                >
                  <UniversalMasterListNameCell
                    name={row.partyDisplayName}
                    onEdit={() => {
                      setViewingId(row.id);
                      setView("detail");
                    }}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.voucherNumber}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.voucherDate}</td>
                  <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right font-medium`}>
                    {formatCurrency(row.totalAmount)}
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
