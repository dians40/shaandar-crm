"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SelectInput, TextInput, TextareaInput } from "@/components/forms/form-fields";
import { useAccounts } from "@/hooks/use-accounts";
import { useJournalEntries } from "@/hooks/use-journal-entries";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import {
  computeJournalTotals,
  isJournalLineFilled,
  validateJournalEntryForm,
} from "@/lib/accounting-voucher-calculator";
import {
  LIST_SEARCH_EMPTY_MESSAGE,
  matchesUniversalNameSearch,
} from "@/lib/list-search-filter";
import {
  createEmptyJournalLine,
  emptyJournalEntryForm,
  type JournalEntryFormState,
  type JournalEntryLine,
} from "@/types/accounting-voucher";
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

type ViewMode = "list" | "add" | "edit" | "detail";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ensureTrailingJournalLine(lines: JournalEntryLine[]): JournalEntryLine[] {
  if (lines.length === 0) return [createEmptyJournalLine("DR"), createEmptyJournalLine("CR")];
  const last = lines[lines.length - 1];
  if (isJournalLineFilled(last)) return [...lines, createEmptyJournalLine(last.side)];
  return lines;
}

export default function JournalEntryPanel() {
  const { accounts, isReady: accountsReady } = useAccounts();
  const { records, isReady: entriesReady, addEntry, updateEntry } = useJournalEntries();

  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<JournalEntryFormState>(emptyJournalEntryForm);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const accountOptions = useMemo(
    () => accounts.map((row) => ({ value: row.id, label: row.name })),
    [accounts]
  );
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((row) => [row.id, row.name])),
    [accounts]
  );

  const totals = useMemo(() => computeJournalTotals(form.lines), [form.lines]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (row) =>
          matchesUniversalNameSearch(searchQuery, row.primaryAccountName) ||
          matchesUniversalNameSearch(searchQuery, row.entryNumber)
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
    setForm(emptyJournalEntryForm());
    setError(null);
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetWorkspace);

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Journal Entry"
      active={view === "list" ? "list" : "add"}
      onAdd={() => {
        setEditingId(null);
        setForm(emptyJournalEntryForm());
        setError(null);
        setView("add");
      }}
      onList={resetWorkspace}
    />
  );

  function updateLine(index: number, patch: Partial<JournalEntryLine>) {
    setForm((prev) => {
      const next = prev.lines.map((row, idx) =>
        idx === index ? { ...row, ...patch } : row
      );
      return { ...prev, lines: ensureTrailingJournalLine(next) };
    });
  }

  function handleSave() {
    const committedLines = form.lines.filter((row) => row.accountId && row.amount > 0);
    const primaryAccountName =
      committedLines[0]?.accountName ||
      accountMap[committedLines[0]?.accountId ?? ""] ||
      "Journal Entry";

    const payload: JournalEntryFormState = {
      ...form,
      entryNumber:
        form.entryNumber.trim() || `JE-${Date.now().toString().slice(-8)}`,
      primaryAccountName,
      lines: committedLines,
    };

    const validationError = validateJournalEntryForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (editingId) updateEntry(editingId, payload);
    else addEntry(payload);
    resetWorkspace();
  }

  if (!accountsReady || !entriesReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-white p-6 text-sm text-corporate-muted">
        Loading Journal Entry…
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.primaryAccountName}
          subtitle={`Journal Entry · ${viewingRecord.entryNumber}`}
          fields={[
            { label: "Date", value: viewingRecord.entryDate },
            { label: "Total Debit", value: formatCurrency(viewingRecord.totalDebit) },
            { label: "Total Credit", value: formatCurrency(viewingRecord.totalCredit) },
            { label: "Balanced", value: viewingRecord.isBalanced },
          ]}
          onBack={() => {
            setViewingId(null);
            setView("list");
          }}
          onEdit={() => {
            setEditingId(viewingRecord.id);
            setForm({
              entryNumber: viewingRecord.entryNumber,
              entryDate: viewingRecord.entryDate,
              primaryAccountName: viewingRecord.primaryAccountName,
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Entry Number"
              value={form.entryNumber}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, entryNumber: event.target.value }))
              }
              placeholder="Auto: JE-…"
            />
            <TextInput
              label="Date"
              type="date"
              value={form.entryDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, entryDate: event.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-corporate-text">
                Double-Entry Distribution
              </h3>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    lines: [...prev.lines, createEmptyJournalLine("DR")],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </button>
            </div>

            <div className="workspace-table-scroll rounded-xl border border-corporate-border">
              <table className="min-w-full text-sm">
                <thead className="bg-corporate-surface text-left text-xs uppercase text-corporate-muted">
                  <tr>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Narration</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, index) => (
                    <tr key={line.id} className="border-t border-corporate-border align-top">
                      <td className="px-3 py-2">
                        <SelectInput
                          label=""
                          value={line.side}
                          onChange={(event) =>
                            updateLine(index, {
                              side: event.target.value === "CR" ? "CR" : "DR",
                            })
                          }
                          options={[
                            { value: "DR", label: "Debit (DR)" },
                            { value: "CR", label: "Credit (CR)" },
                          ]}
                        />
                      </td>
                      <td className="min-w-[180px] px-3 py-2">
                        <SelectInput
                          label=""
                          value={line.accountId}
                          onChange={(event) =>
                            updateLine(index, {
                              accountId: event.target.value,
                              accountName: accountMap[event.target.value] ?? "",
                            })
                          }
                          options={accountOptions}
                          placeholder="Select account"
                        />
                      </td>
                      <td className="min-w-[100px] px-3 py-2">
                        <TextInput
                          label=""
                          type="number"
                          min={0}
                          step="any"
                          value={line.amount || ""}
                          onChange={(event) =>
                            updateLine(index, { amount: Number(event.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="min-w-[180px] px-3 py-2">
                        <TextareaInput
                          label=""
                          rows={2}
                          value={line.narration}
                          onChange={(event) =>
                            updateLine(index, { narration: event.target.value })
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
                                  ? [createEmptyJournalLine("DR")]
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

          <div
            className={`grid gap-2 rounded-xl border p-4 text-sm sm:grid-cols-3 ${
              totals.isBalanced
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p>Total Debit: {formatCurrency(totals.totalDebit)}</p>
            <p>Total Credit: {formatCurrency(totals.totalCredit)}</p>
            <p className="font-semibold">
              {totals.isBalanced ? "Balanced" : "Out of balance"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-corporate-brand px-6 py-2 text-sm font-semibold text-white"
            >
              Save Journal Entry
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
        moduleName="Journal Entry"
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
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Account Name</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Entry #</th>
                <th className={MASTER_LIST_HEADER_CELL_CLASS}>Date</th>
                <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Debit</th>
                <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Credit</th>
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
                    name={row.primaryAccountName}
                    onEdit={() => {
                      setViewingId(row.id);
                      setView("detail");
                    }}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.entryNumber}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.entryDate}</td>
                  <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right`}>
                    {formatCurrency(row.totalDebit)}
                  </td>
                  <td className={`${MASTER_LIST_BODY_CELL_CLASS} text-right`}>
                    {formatCurrency(row.totalCredit)}
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
