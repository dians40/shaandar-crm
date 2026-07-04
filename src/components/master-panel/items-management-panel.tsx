"use client";

import { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import { formatUnitLabel } from "@/constants/units";
import { useMasterDeletionGuard } from "@/hooks/use-master-deletion-guard";
import { useItemGroups } from "@/hooks/use-item-groups";
import { useItems } from "@/hooks/use-items";
import { useUnitConversions } from "@/hooks/use-unit-conversions";
import { useUnits } from "@/hooks/use-units";
import { conversionMatchesItemUnits } from "@/lib/item-unit-conversion";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import { selectMasterPanelEntity } from "@/lib/master-panel-entity-bridge";
import {
  EMPTY_ITEM_FORM,
  GST_TAX_OPTIONS,
  validateItemForm,
  type ItemRecord,
} from "@/types/item";
import { formatChainProductFormula } from "@/types/unit-conversion";
import ItemUnitMappingSection from "./item-unit-mapping-section";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import ModuleListActionGroup from "./module-list-action-group";
import ModuleListSearchBar from "./module-list-search-bar";
import UniversalRecordProfile from "./universal-record-profile";

type ViewMode = "list" | "add" | "edit" | "detail";

export default function ItemsManagementPanel() {
  const { items, isReady, addItem, updateItem, removeItem } = useItems();
  const { checkUsedInTransactions } = useMasterDeletionGuard();
  const { groupSelectOptions, isReady: groupsReady } = useItemGroups();
  const { units, unitOptions, isReady: unitsReady } = useUnits();
  const { conversions, isReady: conversionsReady } = useUnitConversions();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_ITEM_FORM);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingRecord = useMemo(
    () => items.find((row) => row.id === viewingId) ?? null,
    [items, viewingId]
  );

  const unitNameById = useMemo(
    () => Object.fromEntries(units.map((unit) => [unit.id, unit.name])),
    [units]
  );

  const resolveLinkedConversionLabel = (conversionId: string) => {
    if (!conversionId) return "—";
    const conversion = conversions.find((row) => row.id === conversionId);
    if (!conversion) return "—";
    return formatChainProductFormula(conversion, unitNameById);
  };

  const reconcileConversionId = (
    primaryUnitId: string,
    alternateUnitId: string,
    currentConversionId: string
  ) => {
    if (!currentConversionId) return "";
    const conversion = conversions.find((row) => row.id === currentConversionId);
    if (
      conversion &&
      conversionMatchesItemUnits(conversion, primaryUnitId, alternateUnitId || null)
    ) {
      return currentConversionId;
    }
    return "";
  };

  const unitDropdownOptions = useMemo(
    () =>
      units.map((unit) => ({
        value: unit.id,
        label: formatUnitLabel(unit),
      })),
    [units]
  );

  const alternateUnitOptions = useMemo(
    () => [{ value: "", label: "None (optional)" }, ...unitDropdownOptions],
    [unitDropdownOptions]
  );

  const gstOptions = useMemo(
    () => GST_TAX_OPTIONS.map((rate) => ({ value: rate, label: `${rate}%` })),
    []
  );

  const filteredItems = useMemo(
    () =>
      items.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.itemName, [
          row.id,
          row.itemGroupName,
          row.primaryUnitName,
          row.alternateUnitName,
          row.hsnCode,
          row.gstTaxPercentage,
        ])
      ),
    [items, searchQuery]
  );

  const resetForm = () => {
    setForm(EMPTY_ITEM_FORM);
    setEditingId(null);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setView("add");
  };

  const openView = (record: ItemRecord) => {
    setViewingId(record.id);
    setView("detail");
  };

  const openEdit = (record: ItemRecord) => {
    setEditingId(record.id);
    setForm({
      itemName: record.itemName,
      itemGroupId: record.itemGroupId,
      itemGroupName: record.itemGroupName,
      primaryUnitId: record.primaryUnitId,
      primaryUnitName: record.primaryUnitName,
      alternateUnitId: record.alternateUnitId,
      alternateUnitName: record.alternateUnitName,
      unitConversionId: record.unitConversionId,
      openingStockQuantity: record.openingStockQuantity,
      openingStockValue: record.openingStockValue,
      purchaseRate: record.purchaseRate,
      salesRateMrp: record.salesRateMrp,
      gstTaxPercentage: record.gstTaxPercentage,
      hsnCode: record.hsnCode,
    });
    setView("edit");
  };

  const handleItemGroupChange = (groupId: string) => {
    const group = groupSelectOptions.find((option) => option.value === groupId);
    setForm((prev) => ({
      ...prev,
      itemGroupId: groupId,
      itemGroupName: group?.label ?? "",
    }));
  };

  const handlePrimaryUnitChange = (unitId: string) => {
    const unit = units.find((row) => row.id === unitId);
    setForm((prev) => {
      const alternateUnitId = prev.alternateUnitId;
      return {
        ...prev,
        primaryUnitId: unitId,
        primaryUnitName: unit?.name ?? "",
        unitConversionId: reconcileConversionId(unitId, alternateUnitId, prev.unitConversionId),
      };
    });
  };

  const handleAlternateUnitChange = (unitId: string) => {
    if (!unitId) {
      setForm((prev) => ({
        ...prev,
        alternateUnitId: "",
        alternateUnitName: "",
        unitConversionId: reconcileConversionId(
          prev.primaryUnitId,
          "",
          prev.unitConversionId
        ),
      }));
      return;
    }
    const unit = units.find((row) => row.id === unitId);
    setForm((prev) => ({
      ...prev,
      alternateUnitId: unitId,
      alternateUnitName: unit?.name ?? "",
      unitConversionId: reconcileConversionId(
        prev.primaryUnitId,
        unitId,
        prev.unitConversionId
      ),
    }));
  };

  const handleConversionChange = (conversionId: string) => {
    setForm((prev) => ({
      ...prev,
      unitConversionId: conversionId,
    }));
  };

  const handleSave = () => {
    const validationError = validateItemForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (groupSelectOptions.length === 0) {
      setError("Create at least one Item Group before adding items.");
      return;
    }

    const payload = {
      ...form,
      itemName: form.itemName.trim(),
      openingStockQuantity: Number(form.openingStockQuantity) || 0,
      openingStockValue: Number(form.openingStockValue) || 0,
      purchaseRate: Number(form.purchaseRate) || 0,
      salesRateMrp: Number(form.salesRateMrp) || 0,
      hsnCode: form.hsnCode.trim(),
    };

    if (view === "edit" && editingId) {
      updateItem(editingId, payload);
    } else {
      addItem(payload);
    }

    resetForm();
    setView("list");
  };

  const handleRemove = (record: ItemRecord) => {
    if (checkUsedInTransactions("item", record.id, record.itemName)) {
      setError("This item cannot be removed because it is used in transactions.");
      return;
    }
    if (!window.confirm(`Remove item "${record.itemName}"?`)) return;
    removeItem(record.id);
  };

  const subTab: "list" | "add" = view === "add" ? "add" : "list";

  const tabBar = (
    <ModuleAddListTabBar
      moduleName="Item"
      active={subTab}
      onList={() => {
        resetForm();
        setViewingId(null);
        setView("list");
      }}
      onAdd={openAdd}
    />
  );

  if (!isReady || !groupsReady || !unitsReady || !conversionsReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading items master...
      </div>
    );
  }

  if (view === "detail" && viewingRecord) {
    return (
      <>
        {tabBar}
        <UniversalRecordProfile
          title={viewingRecord.itemName}
          subtitle={`${viewingRecord.itemGroupName || "Uncategorized"} · Item Profile`}
          fields={[
            { label: "Item Group", value: viewingRecord.itemGroupName },
            { label: "Primary Unit", value: viewingRecord.primaryUnitName },
            { label: "Alternate Unit", value: viewingRecord.alternateUnitName || "—" },
            {
              label: "Conversion Formula",
              value: resolveLinkedConversionLabel(viewingRecord.unitConversionId),
            },
            { label: "Opening Stock Qty", value: viewingRecord.openingStockQuantity },
            {
              label: "Opening Stock Value",
              value: `₹${viewingRecord.openingStockValue.toLocaleString("en-IN")}`,
            },
            {
              label: "Purchase Rate",
              value: `₹${viewingRecord.purchaseRate.toLocaleString("en-IN")}`,
            },
            {
              label: "Sales Rate / MRP",
              value: `₹${viewingRecord.salesRateMrp.toLocaleString("en-IN")}`,
            },
            { label: "GST %", value: viewingRecord.gstTaxPercentage },
            { label: "HSN Code", value: viewingRecord.hsnCode },
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
              {view === "add" ? "Add Item" : "Edit Item"}
            </h2>
            <p className="text-sm text-corporate-muted">
              Products / SKU master with stock, rates, and GST configuration.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {groupSelectOptions.length === 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No item groups found. Add an Item Group first, then return here to create items.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Item Name"
              required
              value={form.itemName}
              onChange={(e) => setForm((prev) => ({ ...prev, itemName: e.target.value }))}
            />
            <SelectInput
              label="Item Group"
              required
              value={form.itemGroupId}
              placeholder="Select item group"
              options={groupSelectOptions}
              onChange={(e) => handleItemGroupChange(e.target.value)}
            />
          </div>

          <ItemUnitMappingSection
            primaryUnitId={form.primaryUnitId}
            alternateUnitId={form.alternateUnitId}
            unitConversionId={form.unitConversionId}
            unitDropdownOptions={
              unitDropdownOptions.length ? unitDropdownOptions : unitOptions
            }
            alternateUnitOptions={alternateUnitOptions}
            conversions={conversions}
            unitNameById={unitNameById}
            onPrimaryUnitChange={handlePrimaryUnitChange}
            onAlternateUnitChange={handleAlternateUnitChange}
            onConversionChange={handleConversionChange}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Opening Stock Quantity"
              type="number"
              min="0"
              step="0.01"
              value={String(form.openingStockQuantity)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  openingStockQuantity: Number(e.target.value) || 0,
                }))
              }
            />
            <TextInput
              label="Opening Stock Value / Rate"
              type="number"
              min="0"
              step="0.01"
              value={String(form.openingStockValue)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  openingStockValue: Number(e.target.value) || 0,
                }))
              }
            />
            <TextInput
              label="Purchase Rate"
              type="number"
              min="0"
              step="0.01"
              value={String(form.purchaseRate)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  purchaseRate: Number(e.target.value) || 0,
                }))
              }
            />
            <TextInput
              label="Sales Rate / MRP"
              type="number"
              min="0"
              step="0.01"
              value={String(form.salesRateMrp)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  salesRateMrp: Number(e.target.value) || 0,
                }))
              }
            />
            <SelectInput
              label="GST Tax Percentage"
              value={form.gstTaxPercentage}
              options={gstOptions}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, gstTaxPercentage: e.target.value }))
              }
            />
            <TextInput
              label="HSN Code"
              value={form.hsnCode}
              onChange={(e) => setForm((prev) => ({ ...prev, hsnCode: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save Item
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
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-corporate-text">Items List</h2>
          <p className="text-sm text-corporate-muted">
            SKU master with groups, units, stock, rates, and GST details.
          </p>
        </div>

        <ModuleListSearchBar
          moduleName="Item"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
          <table className="min-w-full divide-y divide-corporate-border">
            <thead className="bg-corporate-bg">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Group
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Units
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Opening Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  Rates
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
                  GST / HSN
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corporate-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    <Boxes className="mx-auto mb-2 h-6 w-6 opacity-60" />
                    No items yet. Use Add Item to create one.
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-corporate-muted">
                    {LIST_SEARCH_EMPTY_MESSAGE}
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-medium">{row.itemName}</td>
                    <td className="px-4 py-3 text-sm">{row.itemGroupName || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <p>{row.primaryUnitName || "—"}</p>
                      {row.alternateUnitName && (
                        <p className="text-xs text-corporate-muted">
                          Alt: {row.alternateUnitName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p>Qty: {row.openingStockQuantity}</p>
                      <p className="text-xs text-corporate-muted">
                        Value: ₹{row.openingStockValue.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p>Purchase: ₹{row.purchaseRate.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-corporate-muted">
                        MRP: ₹{row.salesRateMrp.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p>{row.gstTaxPercentage}%</p>
                      <p className="text-xs text-corporate-muted">{row.hsnCode || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ModuleListActionGroup
                        onView={() => openView(row)}
                        onSelect={() =>
                          selectMasterPanelEntity({
                            entityType: "item",
                            entityId: row.id,
                            entityName: row.itemName,
                            sourceModuleId: "items-products",
                            targetModuleId: "sales-dispatch",
                          })
                        }
                        onEdit={() => openEdit(row)}
                        extra={
                          <MasterRemoveOrProtected
                            canRemove={
                              !checkUsedInTransactions("item", row.id, row.itemName)
                            }
                            onRemove={() => handleRemove(row)}
                          />
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
