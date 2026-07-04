"use client";

import { useMemo } from "react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import {
  computeTotalBaseUnits,
  formatChainShort,
  formatChainSummary,
  type UnitConversionFormState,
} from "@/types/unit-conversion";
import type { UnitRecord } from "@/types/unit";

type UnitOption = { value: string; label: string };

type UnitConversionFormProps = {
  form: UnitConversionFormState;
  unitOptions: UnitOption[];
  units: UnitRecord[];
  unitNameById?: Record<string, string>;
  error: string | null;
  isEdit: boolean;
  onChange: (next: UnitConversionFormState) => void;
  onSave: () => void;
  onCancel: () => void;
};

const OPTIONAL_UNIT = "__optional__";

function optionalUnitOptions(options: UnitOption[]) {
  return [{ value: OPTIONAL_UNIT, label: "None (optional)" }, ...options];
}

function parseOptionalMultiplier(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export default function UnitConversionForm({
  form,
  unitOptions,
  units,
  unitNameById = {},
  error,
  isEdit,
  onChange,
  onSave,
  onCancel,
}: UnitConversionFormProps) {
  const optionalOptions = useMemo(
    () => optionalUnitOptions(unitOptions),
    [unitOptions]
  );

  const previewTotal = useMemo(
    () =>
      computeTotalBaseUnits(
        form.firstMultiplier,
        form.secondMultiplier,
        form.thirdMultiplier
      ),
    [form.firstMultiplier, form.secondMultiplier, form.thirdMultiplier]
  );

  const chainSummary = useMemo(() => {
    if (!form.baseUnitName) {
      return "Select a main unit to begin. All other fields are optional.";
    }

    return formatChainSummary(
      {
        id: "",
        baseUnitId: form.baseUnitId,
        baseUnitName: form.baseUnitName,
        firstMultiplier: form.firstMultiplier,
        intermediateUnitId: form.intermediateUnitId,
        intermediateUnitName: form.intermediateUnitName,
        secondMultiplier: form.secondMultiplier,
        tertiaryUnitId: form.tertiaryUnitId,
        tertiaryUnitName: form.tertiaryUnitName,
        thirdMultiplier: form.thirdMultiplier,
        fourthUnitId: form.fourthUnitId,
        fourthUnitName: form.fourthUnitName,
        totalBaseUnits: previewTotal,
        createdAt: "",
        updatedAt: "",
      },
      unitNameById
    );
  }, [form, previewTotal, unitNameById]);

  const chainShort = useMemo(
    () =>
      formatChainShort(
        {
          id: "",
          baseUnitId: form.baseUnitId,
          baseUnitName: form.baseUnitName,
          firstMultiplier: form.firstMultiplier,
          intermediateUnitId: form.intermediateUnitId,
          intermediateUnitName: form.intermediateUnitName,
          secondMultiplier: form.secondMultiplier,
          tertiaryUnitId: form.tertiaryUnitId,
          tertiaryUnitName: form.tertiaryUnitName,
          thirdMultiplier: form.thirdMultiplier,
          fourthUnitId: form.fourthUnitId,
          fourthUnitName: form.fourthUnitName,
          totalBaseUnits: previewTotal,
          createdAt: "",
          updatedAt: "",
        },
        unitNameById
      ),
    [form, previewTotal, unitNameById]
  );

  const setUnitField = (
    field: "base" | "secondary" | "tertiary" | "fourth",
    unitId: string
  ) => {
    if (field === "base") {
      const unit = units.find((row) => row.id === unitId);
      onChange({
        ...form,
        baseUnitId: unitId,
        baseUnitName: unit?.name ?? "",
      });
      return;
    }

    if (!unitId || unitId === OPTIONAL_UNIT) {
      if (field === "secondary") {
        onChange({
          ...form,
          intermediateUnitId: null,
          intermediateUnitName: null,
        });
      } else if (field === "tertiary") {
        onChange({
          ...form,
          tertiaryUnitId: null,
          tertiaryUnitName: null,
        });
      } else {
        onChange({
          ...form,
          fourthUnitId: null,
          fourthUnitName: null,
        });
      }
      return;
    }

    const unit = units.find((row) => row.id === unitId);
    const name = unit?.name ?? null;

    if (field === "secondary") {
      onChange({
        ...form,
        intermediateUnitId: unitId,
        intermediateUnitName: name,
      });
    } else if (field === "tertiary") {
      onChange({
        ...form,
        tertiaryUnitId: unitId,
        tertiaryUnitName: name,
      });
    } else {
      onChange({
        ...form,
        fourthUnitId: unitId,
        fourthUnitName: name,
      });
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
      <div>
        <h2 className="text-lg font-semibold text-corporate-text">
          {isEdit ? "Edit / Modify Conversion" : "Add Conversion"}
        </h2>
        <p className="text-sm text-corporate-muted">
          4-level chain: Main → Secondary → Tertiary → Fourth. Only Main Unit is required.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <SelectInput
          label="Level 1 — Main Primary Unit"
          required
          value={form.baseUnitId}
          placeholder="Select main unit"
          options={unitOptions}
          onChange={(e) => setUnitField("base", e.target.value)}
          hint="Required — e.g. Carton, Box, Peti"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Multiplier 1"
            type="number"
            min="0.0001"
            step="any"
            value={form.firstMultiplier != null ? String(form.firstMultiplier) : ""}
            onChange={(e) =>
              onChange({
                ...form,
                firstMultiplier: parseOptionalMultiplier(e.target.value),
              })
            }
            hint="Main → Secondary (e.g. 80)"
          />
          <SelectInput
            label="Level 2 — Secondary Unit"
            value={form.intermediateUnitId ?? OPTIONAL_UNIT}
            options={optionalOptions}
            onChange={(e) => setUnitField("secondary", e.target.value)}
            hint="Optional — e.g. Packet"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Multiplier 2"
            type="number"
            min="0.0001"
            step="any"
            value={form.secondMultiplier != null ? String(form.secondMultiplier) : ""}
            onChange={(e) =>
              onChange({
                ...form,
                secondMultiplier: parseOptionalMultiplier(e.target.value),
              })
            }
            hint="Secondary → Tertiary (e.g. 90)"
          />
          <SelectInput
            label="Level 3 — Tertiary Unit"
            value={form.tertiaryUnitId ?? OPTIONAL_UNIT}
            options={optionalOptions}
            onChange={(e) => setUnitField("tertiary", e.target.value)}
            hint="Optional — e.g. Pieces"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Multiplier 3"
            type="number"
            min="0.0001"
            step="any"
            value={form.thirdMultiplier != null ? String(form.thirdMultiplier) : ""}
            onChange={(e) =>
              onChange({
                ...form,
                thirdMultiplier: parseOptionalMultiplier(e.target.value),
              })
            }
            hint="Tertiary → Fourth level"
          />
          <SelectInput
            label="Level 4 — Fourth Unit"
            value={form.fourthUnitId ?? OPTIONAL_UNIT}
            options={optionalOptions}
            onChange={(e) => setUnitField("fourth", e.target.value)}
            hint="Optional — e.g. Gram, Strip"
          />
        </div>

        <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
            Chain Preview
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-corporate-text">
            {chainShort}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-corporate-muted">{chainSummary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-corporate-brand px-4 py-2 text-sm font-medium text-white"
        >
          Save Conversion
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-corporate-border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
