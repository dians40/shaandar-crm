"use client";

import { Calculator } from "lucide-react";
import { LIST_SEARCH_EMPTY_MESSAGE } from "@/lib/list-search-filter";
import { selectMasterPanelEntity } from "@/lib/master-panel-entity-bridge";
import {
  formatChainShort,
  formatChainSummary,
  formatTotalBaseUnits,
  type UnitConversionRecord,
} from "@/types/unit-conversion";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import ModuleListActionGroup from "./module-list-action-group";
import ModuleListRecordLink from "./module-list-record-link";

type UnitConversionListProps = {
  conversions: UnitConversionRecord[];
  filteredConversions: UnitConversionRecord[];
  unitNameById: Record<string, string>;
  canRemove: (record: UnitConversionRecord) => boolean;
  onView: (record: UnitConversionRecord) => void;
  onEdit: (record: UnitConversionRecord) => void;
  onRemove: (record: UnitConversionRecord) => void;
};

export default function UnitConversionList({
  conversions,
  filteredConversions,
  unitNameById,
  canRemove,
  onView,
  onEdit,
  onRemove,
}: UnitConversionListProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-corporate-border bg-corporate-surface shadow-card">
      <table className="min-w-full divide-y divide-corporate-border">
        <thead className="bg-corporate-bg">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
              Main Unit
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
              Chain Summary
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
              Short Formula
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-corporate-muted">
              Total
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-corporate-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-corporate-border">
          {conversions.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                <Calculator className="mx-auto mb-2 h-6 w-6 opacity-60" />
                No conversions yet. Use Add Conversion to map unit chains.
              </td>
            </tr>
          ) : filteredConversions.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-corporate-muted">
                {LIST_SEARCH_EMPTY_MESSAGE}
              </td>
            </tr>
          ) : (
            filteredConversions.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-corporate-bg/60"
                onClick={() => onView(row)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <ModuleListRecordLink
                    label={row.baseUnitName}
                    onOpen={() => onView(row)}
                  />
                </td>
                <td className="max-w-md px-4 py-3 text-sm">
                  {formatChainSummary(row, unitNameById)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                  {formatChainShort(row, unitNameById)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {formatTotalBaseUnits(row, unitNameById)}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ModuleListActionGroup
                    onView={() => onView(row)}
                    onSelect={() =>
                      selectMasterPanelEntity({
                        entityType: "unit-conversion",
                        entityId: row.id,
                        entityName: row.baseUnitName,
                        sourceModuleId: "unit-conversion",
                      })
                    }
                    onEdit={() => onEdit(row)}
                    extra={
                      <MasterRemoveOrProtected
                        canRemove={canRemove(row)}
                        onRemove={() => onRemove(row)}
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
  );
}
