"use client";

import { useMemo, useState } from "react";
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import {
  SelectInput,
  TextInput,
  TextareaInput,
  ToggleInput,
} from "@/components/forms/form-fields";
import { useAccountGroups } from "@/hooks/use-account-groups";
import { useAccounts } from "@/hooks/use-accounts";
import {
  EMPTY_ACCOUNT_FORM,
  validateAccountForm,
  type AccountRecord,
  type OpeningBalanceType,
} from "@/types/account";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "add" | "edit";

export default function AccountsManagementPanel() {
  const { accounts, isReady, addAccount, updateAccount, removeAccount } = useAccounts();
  const { groups, isReady: groupsReady } = useAccountGroups();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_ACCOUNT_FORM);
  const [error, setError] = useState<string | null>(null);

  const groupOptions = useMemo(
    () => (groups ?? []).map((name) => ({ value: name, label: name })),
    [groups]
  );

  const resetForm = () => {
    setForm(EMPTY_ACCOUNT_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openEdit = (record: AccountRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      groupName: record.groupName,
      openingBalanceAmount: record.openingBalanceAmount,
      openingBalanceType: record.openingBalanceType,
      address: record.address,
      gstNumber: record.gstNumber,
      panNumber: record.panNumber,
      others: record.others,
      mobileNumber: record.mobileNumber,
      contactPersonNumber: record.contactPersonNumber,
      stationDestination: record.stationDestination,
      distanceKm: record.distanceKm,
      bankAccountNo: record.bankAccountNo,
      bankIfsc: record.bankIfsc,
      bankName: record.bankName,
      maintenanceFlags: record.maintenanceFlags,
      billByBillBalancing: record.billByBillBalancing,
      creditDays: record.creditDays,
    });
    setView("edit");
  };

  const handleSave = () => {
    const validationError = validateAccountForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...form,
      openingBalanceAmount: Number(form.openingBalanceAmount) || 0,
      distanceKm: Number(form.distanceKm) || 0,
      creditDays: Number(form.creditDays) || 0,
      gstNumber: form.gstNumber.trim().toUpperCase(),
      panNumber: form.panNumber.trim().toUpperCase(),
    };

    if (view === "edit" && editingId) {
      updateAccount(editingId, payload);
    } else {
      addAccount(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: AccountRecord) => {
    if (!window.confirm(`Remove account "${record.name}"?`)) return;
    removeAccount(record.id);
  };

  if (!isReady || !groupsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading accounts master...
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">
            {view === "add" ? "Add Account" : "Edit / Modify Account"}
          </h2>
          <p className="text-sm text-corporate-muted">
            Standard ERP ledger master with opening balance and bill-by-bill settings.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Name (Account / Party Name)"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <SelectInput
            label="Group Name"
            required
            value={form.groupName}
            placeholder="Select account group"
            options={groupOptions}
            onChange={(e) => setForm((prev) => ({ ...prev, groupName: e.target.value }))}
            hint="Linked to Account Group master heads"
          />
          <TextInput
            label="Opening Balance Amount"
            type="number"
            min="0"
            step="0.01"
            value={String(form.openingBalanceAmount)}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                openingBalanceAmount: Number(e.target.value) || 0,
              }))
            }
          />
          <div>
            <p className="form-label">Opening Balance Type</p>
            <div className="mt-1 flex gap-2">
              {(["DR", "CR"] as OpeningBalanceType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, openingBalanceType: type }))
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    form.openingBalanceType === type
                      ? "border-corporate-brand bg-corporate-brand text-white"
                      : "border-corporate-border bg-white text-corporate-text hover:bg-corporate-bg"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <TextareaInput
              label="Address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <TextInput
            label="GST Number"
            value={form.gstNumber}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
            onChange={(e) => setForm((prev) => ({ ...prev, gstNumber: e.target.value }))}
            hint="15-character GSTIN (validated on save)"
          />
          <TextInput
            label="PAN Number"
            value={form.panNumber}
            placeholder="ABCDE1234F"
            maxLength={10}
            onChange={(e) => setForm((prev) => ({ ...prev, panNumber: e.target.value }))}
            hint="10-character PAN (validated on save)"
          />
          <TextInput
            label="Mobile Number"
            value={form.mobileNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, mobileNumber: e.target.value }))
            }
          />
          <TextInput
            label="Contact Person Number"
            value={form.contactPersonNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, contactPersonNumber: e.target.value }))
            }
          />
          <TextInput
            label="Station / Destination"
            value={form.stationDestination}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, stationDestination: e.target.value }))
            }
          />
          <TextInput
            label="Distance in Kilometers"
            type="number"
            min="0"
            step="0.1"
            value={String(form.distanceKm)}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, distanceKm: Number(e.target.value) || 0 }))
            }
            hint="Exact distance from factory or main godown"
          />
          <TextInput
            label="Bank Account No."
            value={form.bankAccountNo}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, bankAccountNo: e.target.value }))
            }
          />
          <TextInput
            label="Bank IFSC"
            value={form.bankIfsc}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, bankIfsc: e.target.value.toUpperCase() }))
            }
          />
          <TextInput
            label="Bank Name"
            value={form.bankName}
            onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
          />
          <TextInput
            label="Credit Days"
            type="number"
            min="0"
            step="1"
            value={String(form.creditDays)}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, creditDays: Number(e.target.value) || 0 }))
            }
            hint="Allowed payment terms in days"
          />
          <div className="sm:col-span-2">
            <TextareaInput
              label="Others"
              hint="Flexible additional account data"
              value={form.others}
              onChange={(e) => setForm((prev) => ({ ...prev, others: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaInput
              label="Maintenance Flags"
              hint="Internal flags or maintenance notes for this account"
              value={form.maintenanceFlags}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, maintenanceFlags: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <ToggleInput
              label="Bill-by-Bill Balancing"
              description="Enable party-wise bill tracking and balancing"
              checked={form.billByBillBalancing}
              onChange={(checked) =>
                setForm((prev) => ({ ...prev, billByBillBalancing: checked }))
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
          >
            Save Account
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
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">Accounts Master</h2>
          <p className="text-sm text-corporate-muted">
            Add, edit, or remove ledger accounts with full party details.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-full bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
        <table className="min-w-full divide-y divide-corporate-border">
          <thead className="bg-corporate-bg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Group
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Opening Bal.
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Bill-by-Bill
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                Credit Days
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  <Landmark className="mx-auto mb-2 h-6 w-6 opacity-60" />
                  No accounts yet. Click Add to create one.
                </td>
              </tr>
            ) : (
              accounts.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.groupName}</td>
                  <td className="px-4 py-3 text-sm">
                    ₹{row.openingBalanceAmount.toLocaleString("en-IN")} {row.openingBalanceType}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.billByBillBalancing ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3 text-sm">{row.creditDays}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit / Modify
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
