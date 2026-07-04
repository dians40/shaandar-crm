"use client";

import { useMemo } from "react";
import { Calculator } from "lucide-react";
import { SelectInput } from "@/components/forms/form-fields";
import {
  buildConversionSelectOptions,
  filterConversionsForItem,
  resolveItemConversionPreview,
} from "@/lib/item-unit-conversion";
import type { UnitConversionRecord } from "@/types/unit-conversion";

type UnitOption = { value: string; label: string };

type ItemUnitMappingSectionProps = {
  primaryUnitId: string;
  alternateUnitId: string;
  unitConversionId: string;
  unitDropdownOptions: UnitOption[];
  alternateUnitOptions: UnitOption[];
  conversions: UnitConversionRecord[];
  unitNameById: Record<string, string>;
  onPrimaryUnitChange: (unitId: string) => void;
  onAlternateUnitChange: (unitId: string) => void;
  onConversionChange: (conversionId: string) => void;
};

export default function ItemUnitMappingSection({
  primaryUnitId,
  alternateUnitId,
  unitConversionId,
  unitDropdownOptions,
  alternateUnitOptions,
  conversions,
  unitNameById,
  onPrimaryUnitChange,
  onAlternateUnitChange,
  onConversionChange,
}: ItemUnitMappingSectionProps) {
  const matchingConversions = useMemo(
    () => filterConversionsForItem(conversions, primaryUnitId, alternateUnitId),
    [conversions, primaryUnitId, alternateUnitId]
  );

  const conversionOptions = useMemo(
    () => buildConversionSelectOptions(matchingConversions, unitNameById),
    [matchingConversions, unitNameById]
  );

  const selectedConversion = useMemo(
    () => conversions.find((row) => row.id === unitConversionId) ?? null,
    [conversions, unitConversionId]
  );

  const preview = useMemo(
    () => resolveItemConversionPreview(selectedConversion, unitNameById),
    [selectedConversion, unitNameById]
  );

  const conversionPlaceholder = !primaryUnitId
    ? "Select primary unit first"
    : matchingConversions.length === 0
      ? "No matching formulas for selected units"
      : "Select unit conversion formula";

  return (
    <div className="space-y-4 rounded-xl border border-corporate-border/80 bg-corporate-bg/40 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-corporate-text">Unit & Conversion Mapping</h3>
        <p className="mt-0.5 text-xs text-corporate-muted">
          Link selling units to bulk packaging and the exact conversion formula for stock math.
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
          value={alternateUnitId}
          options={alternateUnitOptions}
          onChange={(event) => onAlternateUnitChange(event.target.value)}
          hint="Select the larger bulk package layer if you buy/store this item in groups (e.g., Carton, Box, Peti)."
        />
      </div>

      <SelectInput
        label="Link Unit Conversion Formula"
        value={unitConversionId}
        placeholder={conversionPlaceholder}
        options={conversionOptions}
        onChange={(event) => onConversionChange(event.target.value)}
        disabled={!primaryUnitId || matchingConversions.length === 0}
        hint="Select the exact mathematical rule to let the ERP auto-calculate your multi-level stocks (e.g., 1 Carton × 120 Packets × 70 Pieces)."
      />

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
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-corporate-muted">
                {!primaryUnitId
                  ? "Choose a primary unit to see available conversion formulas."
                  : matchingConversions.length === 0
                    ? "No conversion formula in Unit Conversion Master matches these units yet. Add one under Unit Conversion, then return here."
                    : "Select a conversion formula above to preview how stock will be calculated across packaging levels."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
