"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { useGodowns } from "@/hooks/use-godowns";
import { useItems } from "@/hooks/use-items";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { useTransferVouchers } from "@/hooks/use-transfer-vouchers";
import {
  isTransferLineFilled,
  validateTransferVoucherForm,
} from "@/lib/accounting-voucher-calculator";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import {
  createEmptyTransferLine,
  emptyTransferVoucherForm,
  type TransferVoucherFormState,
} from "@/types/accounting-voucher";
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

function ensureTrailingTransferLine(
  lines: ReturnType<typeof createEmptyTransferLine>[]
) {
  if (lines.length === 0) return [createEmptyTransferLine()];
  const last = lines[lines.length - 1];
  if (isTransferLineFilled(last)) return [...lines, createEmptyTransferLine()];
  return lines;
}

export default function TransferVoucherPanel() {
  const { godowns, isReady: godownsReady } = useGodowns();
  const { items, isReady: itemsReady } = useItems();
  const { records, isReady: transfersReady, addTransfer } = useTransferVouchers();

  const [view, setView] = useState<ViewMode>("list");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<TransferVoucherFormState>(emptyTransferVoucherForm);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const godownOptions = useMemo(
    () =>
      godowns
        .filter((row) => row.isActive)
        .map((row) => ({ value: row.id, label: row.name })),
    [godowns]
  );
  const godownMap = useMemo(
    () => Object.fromEntries(godowns.map((row) => [row.id, row.name])),
    [godowns]
  );
  const itemOptions = useMemo(
    () => items.map((row) => ({ value: row.id, label: row.itemName })),
    [items]
  );
  const itemMap = useMemo(
    () => Object.fromEntries(items.map((row) => [row.id, row.itemName])),
    [items]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (row) =>
          matchesUniversalNameSearch(searchQuery, row.displayLabel) ||
          matchesUniversalNameSearch(searchQuery, row.transferNumber)
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
    setForm(emptyTransferVoucherForm());
    setError(null);
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetWorkspace);

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Inventory Transfer"
      active={view === "list" ? "list" : "add"}
      onAdd={() => {
        setForm(emptyTransferVoucherForm());
        setError(null);
        setView("add");
      }}
      onList={resetWorkspace}
    />
  );

  function updateLine(index: number, patch: Partial<(typeof form.lines)[0]>) {
    setForm((prev) => {
      const next = prev.lines.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
      return { ...prev, lines: ensureTrailingTransferLine(next) };
    });
  }

  function handleSave() {
    const committedLines = form.lines.filter((row) => isTransferLineFilled(row));
    const firstLine = committedLines[0];
    const displayLabel = firstLine
      ? `${firstLine.sourceGodownName} → ${firstLine.destinationGodownName}`
      : "Transfer";

    const payload: TransferVoucherFormState = {
      ...form,
      transferNumber:
        form.transferNumber.trim() || `TRF-${Date.now().toString().slice(-8)}`,
      displayLabel,
      lines: committedLines,
    };

    const validationError = validateTransferVoucherForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    addTransfer(payload);
    resetWorkspace();
  }

  if (!godownsReady || !itemsReady || !transfersReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-6 text-sm text-corporate-muted">
        Loading Inventory Transfer…
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.displayLabel}
          subtitle={`Transfer · ${viewingRecord.transferNumber}`}
          fields={[
            { label: "Date", value: viewingRecord.transferDate },
            { label: "Lines", value: `${viewingRecord.lines.length} transfer line(s)` },
          ]}
          onBack={() => {
            setViewingId(null);
            setView("list");
          }}
          onEdit={() => {
            setForm({
              transferNumber: viewingRecord.transferNumber,
              transferDate: viewingRecord.transferDate,
              displayLabel: viewingRecord.displayLabel,
              lines: viewingRecord.lines,
            });
            setView("add");
          }}
        />
      </>
    );
  }

  if (view === "add") {
    return (
      <>
        {tabBar}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Transfer Number"
              value={form.transferNumber}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, transferNumber: event.target.value }))
              }
              placeholder="Auto: TRF-…"
            />
            <TextInput
              label="Date"
              type="date"
              value={form.transferDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, transferDate: event.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-corporate-text">Transfer Lines</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    lines: [...prev.lines, createEmptyTransferLine()],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-corporate-border">
              <table className="min-w-full text-sm">
                <thead className="bg-corporate-surface text-left text-xs uppercase text-corporate-muted">
                  <tr>
                    <th className="px-3 py-2">Source Godown</th>
                    <th className="px-3 py-2">Destination Godown</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Transfer Reference</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, index) => (
                    <tr key={line.id} className="border-t border-corporate-border align-top">
                      <td className="min-w-[160px] px-3 py-2">
                        <SelectInput
                          label=""
                          value={line.sourceGodownId}
                          onChange={(event) =>
                            updateLine(index, {
                              sourceGodownId: event.target.value,
                              sourceGodownName: godownMap[event.target.value] ?? "",
                            })
                          }
                          options={godownOptions}
                          placeholder="Source"
                        />
                      </td>
                      <td className="min-w-[160px] px-3 py-2">
                        <SelectInput
                          label=""
                          value={line.destinationGodownId}
                          onChange={(event) =>
                            updateLine(index, {
                              destinationGodownId: event.target.value,
                              destinationGodownName: godownMap[event.target.value] ?? "",
                            })
                          }
                          options={godownOptions}
                          placeholder="Destination"
                        />
                      </td>
                      <td className="min-w-[160px] px-3 py-2">
                        <SelectInput
                          label=""
                          value={line.itemId}
                          onChange={(event) =>
                            updateLine(index, {
                              itemId: event.target.value,
                              itemName: itemMap[event.target.value] ?? "",
                            })
                          }
                          options={itemOptions}
                          placeholder="Select item"
                        />
                      </td>
                      <td className="min-w-[90px] px-3 py-2">
                        <TextInput
                          label=""
                          type="number"
                          min={0}
                          step="any"
                          value={line.quantity || ""}
                          onChange={(event) =>
                            updateLine(index, { quantity: Number(event.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="min-w-[140px] px-3 py-2">
                        <TextInput
                          label=""
                          value={line.transferReference}
                          onChange={(event) =>
                            updateLine(index, { transferReference: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              lines:
                                prev.lines.length <= 1
                                  ? [createEmptyTransferLine()]
                                  : prev.lines.filter((_, idx) => idx !== index),
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
              Save Transfer
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
        moduleName="Inventory Transfer"
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
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>From / To</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Transfer #</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Lines</th>
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
                    name={row.displayLabel}
                    onEdit={() => {
                      setViewingId(row.id);
                      setView("detail");
                    }}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.transferNumber}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.transferDate}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.lines.length}</td>
                </UniversalMasterListRow>
              ))}
            </tbody>
          </UniversalMasterListTable>
        )}
      </UniversalMasterListShell>
    </>
  );
}
