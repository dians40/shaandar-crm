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
import {
  bindConversionToItem,
  clearConversionBinding,
  conversionMatchesItemUnits,
  formatChainAlternateOptionLabel,
  hydrateItemConversionBinding,
  resolveItemConversionRecord,
} from "@/lib/item-unit-conversion";
import { LIST_SEARCH_EMPTY_MESSAGE, matchesUniversalNameSearch } from "@/lib/list-search-filter";
import {
  EMPTY_ITEM_FORM,
  GST_TAX_OPTIONS,
  validateItemForm,
  type ItemRecord,
} from "@/types/item";
import ItemUnitMappingSection from "./item-unit-mapping-section";
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
  useMasterListFilters,
} from "./universal-master-list";

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

  const resolveLinkedConversionLabel = (record: ItemRecord) => {
    if (record.alternateUnitName?.trim()) return record.alternateUnitName;
    if (!record.unitConversionId) return "—";
    const conversion = conversions.find((row) => row.id === record.unitConversionId);
    if (!conversion) return "—";
    return formatChainAlternateOptionLabel(conversion, unitNameById);
  };

  const unitDropdownOptions = useMemo(
    () =>
      units.map((unit) => ({
        value: unit.id,
        label: formatUnitLabel(unit),
      })),
    [units]
  );

  const gstOptions = useMemo(
    () => GST_TAX_OPTIONS.map((rate) => ({ value: rate, label: `${rate}%` })),
    []
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
    const hydrated = hydrateItemConversionBinding(record, conversions, unitNameById);
    setForm({
      itemName: hydrated.itemName,
      itemGroupId: hydrated.itemGroupId,
      itemGroupName: hydrated.itemGroupName,
      primaryUnitId: hydrated.primaryUnitId,
      primaryUnitName: hydrated.primaryUnitName,
      alternateUnitId: hydrated.alternateUnitId,
      alternateUnitName: hydrated.alternateUnitName,
      unitConversionId: hydrated.unitConversionId,
      conversionFirstMultiplier: hydrated.conversionFirstMultiplier,
      conversionSecondMultiplier: hydrated.conversionSecondMultiplier,
      conversionThirdMultiplier: hydrated.conversionThirdMultiplier,
      conversionTotalBaseUnits: hydrated.conversionTotalBaseUnits,
      openingStockQuantity: hydrated.openingStockQuantity,
      openingStockValue: hydrated.openingStockValue,
      minimumStockLevel: hydrated.minimumStockLevel,
      maximumStockLevel: hydrated.maximumStockLevel,
      reorderLevel: hydrated.reorderLevel,
      purchaseRate: hydrated.purchaseRate,
      salesRateMrp: hydrated.salesRateMrp,
      gstTaxPercentage: hydrated.gstTaxPercentage,
      hsnCode: hydrated.hsnCode,
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
      const conversion = resolveItemConversionRecord(prev, conversions);
      const stillValid =
        conversion != null && conversionMatchesItemUnits(conversion, unitId);

      if (stillValid && conversion) {
        return {
          ...prev,
          primaryUnitId: unitId,
          primaryUnitName: unit?.name ?? "",
          ...bindConversionToItem(conversion, unitNameById),
        };
      }

      return {
        ...prev,
        primaryUnitId: unitId,
        primaryUnitName: unit?.name ?? "",
        ...clearConversionBinding(),
      };
    });
  };

  const handleAlternateFormulaChange = (conversionId: string) => {
    if (!conversionId) {
      setForm((prev) => ({
        ...prev,
        ...clearConversionBinding(),
      }));
      return;
    }

    const conversion = conversions.find((row) => row.id === conversionId);
    if (!conversion) return;

    setForm((prev) => ({
      ...prev,
      ...bindConversionToItem(conversion, unitNameById),
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
      minimumStockLevel: Number(form.minimumStockLevel) || 0,
      maximumStockLevel: Number(form.maximumStockLevel) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
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
            {
              label: "Packaging Formula",
              value: resolveLinkedConversionLabel(viewingRecord),
            },
            {
              label: "Stock Calculation Factor",
              value:
                viewingRecord.conversionTotalBaseUnits != null &&
                viewingRecord.conversionTotalBaseUnits > 0
                  ? `×${viewingRecord.conversionTotalBaseUnits.toLocaleString("en-IN")} ${viewingRecord.primaryUnitName} per bulk unit`
                  : "—",
            },
            { label: "Opening Stock Qty", value: viewingRecord.openingStockQuantity },
            {
              label: "Opening Stock Value",
              value: `₹${viewingRecord.openingStockValue.toLocaleString("en-IN")}`,
            },
            {
              label: "Minimum Stock Level",
              value: viewingRecord.minimumStockLevel.toLocaleString("en-IN"),
            },
            {
              label: "Maximum Stock Level",
              value: viewingRecord.maximumStockLevel.toLocaleString("en-IN"),
            },
            {
              label: "Reorder Level",
              value: viewingRecord.reorderLevel.toLocaleString("en-IN"),
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
            unitConversionId={form.unitConversionId}
            conversionFactors={{
              conversionFirstMultiplier: form.conversionFirstMultiplier,
              conversionSecondMultiplier: form.conversionSecondMultiplier,
              conversionThirdMultiplier: form.conversionThirdMultiplier,
              conversionTotalBaseUnits: form.conversionTotalBaseUnits,
            }}
            unitDropdownOptions={
              unitDropdownOptions.length ? unitDropdownOptions : unitOptions
            }
            conversions={conversions}
            unitNameById={unitNameById}
            onPrimaryUnitChange={handlePrimaryUnitChange}
            onAlternateFormulaChange={handleAlternateFormulaChange}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </div>

          <section className="form-section-card space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-corporate-text">
                Universal Stock Level Parameters
              </h3>
              <p className="text-xs text-corporate-muted">
                Mandatory thresholds for finished goods, raw materials, machinery components, and
                parts — drives Display stock alerts.
              </p>
            </div>
            <div className="form-grid">
              <TextInput
                label="Minimum Stock Level"
                type="number"
                min="0"
                step="0.01"
                required
                value={String(form.minimumStockLevel)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    minimumStockLevel: Number(e.target.value) || 0,
                  }))
                }
              />
              <TextInput
                label="Maximum Stock Level"
                type="number"
                min="0"
                step="0.01"
                required
                value={String(form.maximumStockLevel)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maximumStockLevel: Number(e.target.value) || 0,
                  }))
                }
              />
              <TextInput
                label="Reorder Level"
                type="number"
                min="0"
                step="0.01"
                required
                value={String(form.reorderLevel)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    reorderLevel: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <UniversalMasterListShell
        moduleName="Item"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        title="Items List"
        subtitle="SKU master with groups, units, stock, rates, and GST details."
      >
        <UniversalMasterListTable>
          <thead className={MASTER_LIST_HEAD_CLASS}>
            <tr>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Item</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Group</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Units</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Opening Stock</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Stock Levels</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>Rates</th>
              <th className={MASTER_LIST_HEADER_CELL_CLASS}>GST / HSN</th>
              <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border">
            <ItemsListBody
              items={items}
              onEdit={openEdit}
              onView={openView}
              onRemove={handleRemove}
              checkUsedInTransactions={checkUsedInTransactions}
            />
          </tbody>
        </UniversalMasterListTable>
      </UniversalMasterListShell>
    </>
  );
}

type ItemsListBodyProps = {
  items: ItemRecord[];
  onEdit: (record: ItemRecord) => void;
  onView: (record: ItemRecord) => void;
  onRemove: (record: ItemRecord) => void;
  checkUsedInTransactions: ReturnType<typeof useMasterDeletionGuard>["checkUsedInTransactions"];
};

function ItemsListBody({
  items,
  onEdit,
  onView,
  onRemove,
  checkUsedInTransactions,
}: ItemsListBodyProps) {
  const { searchQuery, departmentFilter, designationFilter } = useMasterListFilters();
  const filteredItems = useMemo(
    () =>
      items.filter((row) =>
        matchesUniversalNameSearch(
          searchQuery,
          row.itemName,
          [
            row.id,
            row.itemGroupName,
            row.primaryUnitName,
            row.alternateUnitName,
            row.hsnCode,
            row.gstTaxPercentage,
          ],
          {
            departmentFilter,
            designationFilter,
            skipDepartmentIfAbsent: true,
            skipDesignationIfAbsent: true,
          }
        )
      ),
    [items, searchQuery, departmentFilter, designationFilter]
  );

  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-10 text-center text-sm text-corporate-muted">
          <Boxes className="mx-auto mb-2 h-6 w-6 opacity-60" />
          No items yet. Use Add Item to create one.
        </td>
      </tr>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-10 text-center text-sm text-corporate-muted">
          {LIST_SEARCH_EMPTY_MESSAGE}
        </td>
      </tr>
    );
  }

  return (
    <>
      {filteredItems.map((row) => (
        <UniversalMasterListRow key={row.id} onEdit={() => onEdit(row)}>
          <UniversalMasterListNameCell name={row.itemName} onEdit={() => onEdit(row)} />
          <td className={MASTER_LIST_BODY_CELL_CLASS}>{row.itemGroupName || "—"}</td>
          <td className={MASTER_LIST_BODY_CELL_CLASS}>
            <p>{row.primaryUnitName || "—"}</p>
            {row.alternateUnitName && (
              <p className="text-xs text-corporate-muted">{row.alternateUnitName}</p>
            )}
          </td>
          <td className={MASTER_LIST_BODY_CELL_CLASS}>
            <p>Qty: {row.openingStockQuantity}</p>
            <p className="text-xs text-corporate-muted">
              Value: ₹{row.openingStockValue.toLocaleString("en-IN")}
            </p>
          </td>
          <td className={MASTER_LIST_BODY_CELL_CLASS}>
            <p className="text-xs">Min: {row.minimumStockLevel.toLocaleString("en-IN")}</p>
            <p className="text-xs text-corporate-muted">
              Max: {row.maximumStockLevel.toLocaleString("en-IN")} · Reorder:{" "}
              {row.reorderLevel.toLocaleString("en-IN")}
            </p>
          </td>
          <td className={MASTER_LIST_BODY_CELL_CLASS}>
            <p>Purchase: ₹{row.purchaseRate.toLocaleString("en-IN")}</p>
            <p className="text-xs text-corporate-muted">
              MRP: ₹{row.salesRateMrp.toLocaleString("en-IN")}
            </p>
          </td>
          <td className={MASTER_LIST_BODY_CELL_CLASS}>
            <p>{row.gstTaxPercentage}%</p>
            <p className="text-xs text-corporate-muted">{row.hsnCode || "—"}</p>
          </td>
          <UniversalMasterListActionsCell>
            <ModuleListActionGroup
              onView={() => onView(row)}
              onEdit={() => onEdit(row)}
              extra={
                <MasterRemoveOrProtected
                  canRemove={!checkUsedInTransactions("item", row.id, row.itemName)}
                  onRemove={() => onRemove(row)}
                />
              }
            />
          </UniversalMasterListActionsCell>
        </UniversalMasterListRow>
      ))}
    </>
  );
}
