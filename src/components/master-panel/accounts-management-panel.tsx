"use client";

import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import {
  SelectInput,
  TextInput,
  TextareaInput,
  ToggleInput,
} from "@/components/forms/form-fields";
import { useAccountGroups } from "@/hooks/use-account-groups";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useAccounts } from "@/hooks/use-accounts";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
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
import {
  EMPTY_ACCOUNT_FORM,
  validateAccountForm,
  type AccountRecord,
  type OpeningBalanceType,
} from "@/types/account";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "add" | "edit" | "detail";

export default function AccountsManagementPanel() {
  const { accounts, isReady, addAccount, updateAccount, removeAccount } = useAccounts();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const { groupNames, isReady: groupsReady } = useAccountGroups();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_ACCOUNT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const groupOptions = useMemo(
    () => (groupNames ?? []).map((name) => ({ value: name, label: name })),
    [groupNames]
  );

  const [searchQuery, setSearchQuery] = useState("");

  const viewingRecord = useMemo(
    () => accounts.find((row) => row.id === viewingId) ?? null,
    [accounts, viewingId]
  );
  const filteredAccounts = useMemo(
    () =>
      accounts.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.name, [
          row.id,
          row.groupName,
          row.gstNumber,
          row.panNumber,
          row.mobileNumber,
        ])
      ),
    [accounts, searchQuery]
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

  const openView = (record: AccountRecord) => {
    setViewingId(record.id);
    setView("detail");
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
    if (checkUsedInTransactions("account", record.id, record.name)) {
      setError("This account cannot be removed because it is used in transactions.");
      return;
    }
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

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Account"
      active={subTab}
      onList={() => {
        resetForm();
        setViewingId(null);
        setView("list");
      }}
      onAdd={openAdd}
    />
  );

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.name}
          subtitle={`${viewingRecord.groupName} · Party Account Profile`}
          fields={[
            { label: "Group", value: viewingRecord.groupName },
            {
              label: "Opening Balance",
              value: `₹${viewingRecord.openingBalanceAmount.toLocaleString("en-IN")} ${viewingRecord.openingBalanceType}`,
            },
            { label: "GST Number", value: viewingRecord.gstNumber },
            { label: "PAN Number", value: viewingRecord.panNumber },
            { label: "Mobile", value: viewingRecord.mobileNumber },
            { label: "Contact Person", value: viewingRecord.contactPersonNumber },
            { label: "Address", value: viewingRecord.address },
            { label: "Station / Destination", value: viewingRecord.stationDestination },
            { label: "Distance (km)", value: viewingRecord.distanceKm },
            { label: "Bill-by-Bill", value: viewingRecord.billByBillBalancing },
            { label: "Credit Days", value: viewingRecord.creditDays },
            { label: "Bank Account", value: viewingRecord.bankAccountNo },
            { label: "Bank IFSC", value: viewingRecord.bankIfsc },
            { label: "Bank Name", value: viewingRecord.bankName },
            { label: "Others", value: viewingRecord.others },
            { label: "Maintenance Flags", value: viewingRecord.maintenanceFlags },
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
      </>
    );
  }

  return (
    <>
      {tabBar}
      <UniversalMasterListShell
        moduleName="Account"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Accounts Master"
        subtitle="Add, edit, or remove ledger accounts with full party details."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Name</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Group</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Opening Bal.</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Bill-by-Bill</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Credit Days</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
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
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-corporate-muted">
                  {LIST_SEARCH_EMPTY_MESSAGE}
                </td>
              </tr>
            ) : (
              filteredAccounts.map((row) => (
                <UniversalMasterListRow key={row.id} onEdit={() => openEdit(row)}>
                  <UniversalMasterListNameCell
                    name={row.name}
                    onEdit={() => openEdit(row)}
                  />
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.groupName}</td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    ₹{row.openingBalanceAmount.toLocaleString("en-IN")} {row.openingBalanceType}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>
                    {row.billByBillBalancing ? "Yes" : "No"}
                  </td>
                  <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.creditDays}</td>
                  <UniversalMasterListActionsCell>
                    <ModuleListActionGroup
                      onView={() => openView(row)}
                      onEdit={() => openEdit(row)}
                      extra={
                        <MasterRemoveOrProtected
                          canRemove={
                            !checkUsedInTransactions("account", row.id, row.name)
                          }
                          onRemove={() => handleRemove(row)}
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
