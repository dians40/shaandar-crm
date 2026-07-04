"use client";

import { Calculator } from "lucide-react";
import { LIST_SEARCH_EMPTY_MESSAGE } from "@/lib/list-search-filter";
import {
  formatChainProductFormula,
  formatChainSummary,
  formatTotalBaseUnits,
  type UnitConversionRecord,
} from "@/types/unit-conversion";
import MasterRemoveOrProtected from "./master-remove-or-protected";
import ModuleListActionGroup from "./module-list-action-group";
import {
  MASTER_LIST_BODY_CELL_CLASS,
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_HEADER_CELL_RIGHT_CLASS,
  UniversalMasterListActionsCell,
  UniversalMasterListNameCell,
  UniversalMasterListRow,
  UniversalMasterListTable,
} from "./universal-master-list";

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
    <UniversalMasterListTable>
      <thead className={MASTER_LIST_HEAD_CLASS}>
        <tr>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Main Unit</th>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Chain Summary</th>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Short Formula</th>
          <th className={MASTER_LIST_HEADER_CELL_CLASS}>Total</th>
          <th className={MASTER_LIST_HEADER_CELL_RIGHT_CLASS}>Actions</th>
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
            <UniversalMasterListRow key={row.id} onEdit={() => onEdit(row)}>
              <UniversalMasterListNameCell
                name={row.baseUnitName}
                onEdit={() => onEdit(row)}
              />
              <td className={`max-w-md ${MASTER_LIST_BODY_CELL_CLASS}`}>
                {formatChainSummary(row, unitNameById)}
              </td>
              <td className={`whitespace-nowrap font-medium ${MASTER_LIST_BODY_CELL_CLASS}`}>
                {formatChainProductFormula(row, unitNameById)}
              </td>
              <td className={`whitespace-nowrap ${MASTER_LIST_BODY_CELL_CLASS}`}>
                {formatTotalBaseUnits(row, unitNameById)}
              </td>
              <UniversalMasterListActionsCell>
                <ModuleListActionGroup
                  onView={() => onView(row)}
                  onEdit={() => onEdit(row)}
                  extra={
                    <MasterRemoveOrProtected
                      canRemove={canRemove(row)}
                      onRemove={() => onRemove(row)}
                    />
                  }
                />
              </UniversalMasterListActionsCell>
            </UniversalMasterListRow>
          ))
        )}
      </tbody>
    </UniversalMasterListTable>
  );
}
