"use client";

import { useMemo } from "react";
import { Calculator } from "lucide-react";
import { SelectInput } from "@/components/forms/form-fields";
import {
  buildAlternateFormulaOptions,
  filterConversionsForItem,
  resolveItemConversionPreview,
  resolveItemConversionFactor,
} from "@/lib/item-unit-conversion";
import type { ItemRecord } from "@/types/item";
import type { UnitConversionRecord } from "@/types/unit-conversion";

type UnitOption = { value: string; label: string };

type ItemUnitMappingSectionProps = {
  primaryUnitId: string;
  unitConversionId: string;
  conversionFactors: Pick<
    ItemRecord,
    | "conversionFirstMultiplier"
    | "conversionSecondMultiplier"
    | "conversionThirdMultiplier"
    | "conversionTotalBaseUnits"
  >;
  unitDropdownOptions: UnitOption[];
  conversions: UnitConversionRecord[];
  unitNameById: Record<string, string>;
  onPrimaryUnitChange: (unitId: string) => void;
  onAlternateFormulaChange: (conversionId: string) => void;
};

export default function ItemUnitMappingSection({
  primaryUnitId,
  unitConversionId,
  conversionFactors,
  unitDropdownOptions,
  conversions,
  unitNameById,
  onPrimaryUnitChange,
  onAlternateFormulaChange,
}: ItemUnitMappingSectionProps) {
  const matchingConversions = useMemo(
    () => filterConversionsForItem(conversions, primaryUnitId),
    [conversions, primaryUnitId]
  );

  const alternateFormulaOptions = useMemo(
    () => [
      { value: "", label: "None (optional)" },
      ...buildAlternateFormulaOptions(conversions, primaryUnitId, unitNameById),
    ],
    [conversions, primaryUnitId, unitNameById]
  );

  const selectedConversion = useMemo(
    () => conversions.find((row) => row.id === unitConversionId) ?? null,
    [conversions, unitConversionId]
  );

  const preview = useMemo(
    () => resolveItemConversionPreview(selectedConversion, unitNameById),
    [selectedConversion, unitNameById]
  );

  const activeFactor = useMemo(
    () => resolveItemConversionFactor(conversionFactors),
    [conversionFactors]
  );

  const alternatePlaceholder = !primaryUnitId
    ? "Select primary unit first"
    : matchingConversions.length === 0
      ? "No conversion formulas match this primary unit"
      : "Select packaging formula";

  return (
    <div className="space-y-4 rounded-xl border border-corporate-border/80 bg-corporate-bg/40 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-corporate-text">Unit & Conversion Mapping</h3>
        <p className="mt-0.5 text-xs text-corporate-muted">
          Link selling units to bulk packaging formulas from Unit Conversion Master for accurate
          stock math.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput
          label="Primary Unit (Main Selling Unit)"
          required
          value={primaryUnitId}
          placeholder="Select primary unit"
          options={unitDropdownOptions}
          onChange={(event) => onPrimaryUnitChange(event.target.value)}
          hint="Select the base unit in which this item is loose/individually sold or counted (e.g., Pieces, KG)."
        />
        <SelectInput
          label="Alternate / Bulk Packaging Unit (Optional)"
          value={unitConversionId}
          options={alternateFormulaOptions}
          onChange={(event) => onAlternateFormulaChange(event.target.value)}
          disabled={!primaryUnitId}
          placeholder={alternatePlaceholder}
          hint="Pick a saved conversion formula (e.g., Carton × 120 Packets × 70 Pieces). Multipliers bind automatically for inventory calculation."
        />
      </div>

      <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light/30 px-4 py-3">
        <div className="flex items-start gap-2">
          <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-corporate-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
              Live Formula Preview
            </p>
            {preview.formula ? (
              <>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-corporate-text">
                  {preview.formula}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-corporate-muted">
                  {preview.summary}
                </p>
                {preview.total && preview.total !== "—" && (
                  <p className="mt-1 text-xs font-medium text-corporate-brand">
                    Total per chain: {preview.total}
                  </p>
                )}
                {activeFactor != null && activeFactor > 0 && (
                  <p className="mt-1 text-xs text-corporate-muted">
                    Stock factor bound: ×{activeFactor.toLocaleString("en-IN")} primary units per
                    bulk unit
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-corporate-muted">
                {!primaryUnitId
                  ? "Choose a primary unit to see available conversion formulas."
                  : matchingConversions.length === 0
                    ? "No conversion formula in Unit Conversion Master includes this primary unit yet. Add one under Unit Conversion, then return here."
                    : "Select a packaging formula above to preview and bind multi-level stock calculation."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
