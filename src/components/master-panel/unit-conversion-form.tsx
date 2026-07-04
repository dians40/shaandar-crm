"use client";

import { useMemo } from "react";
import { SelectInput, TextInput } from "@/components/forms/form-fields";
import {
  computeTotalBaseUnits,
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
    () => computeTotalBaseUnits(form.firstMultiplier, form.secondMultiplier),
    [form.firstMultiplier, form.secondMultiplier]
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
        finalUnitId: form.finalUnitId,
        finalUnitName: form.finalUnitName,
        totalBaseUnits: previewTotal,
        createdAt: "",
        updatedAt: "",
      },
      unitNameById
    );
  }, [form, previewTotal, unitNameById]);

  const setUnitField = (
    field: "base" | "intermediate" | "final",
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
      if (field === "intermediate") {
        onChange({
          ...form,
          intermediateUnitId: null,
          intermediateUnitName: null,
        });
      } else {
        onChange({
          ...form,
          finalUnitId: null,
          finalUnitName: null,
        });
      }
      return;
    }

    const unit = units.find((row) => row.id === unitId);
    if (field === "intermediate") {
      onChange({
        ...form,
        intermediateUnitId: unitId,
        intermediateUnitName: unit?.name ?? null,
      });
    } else {
      onChange({
        ...form,
        finalUnitId: unitId,
        finalUnitName: unit?.name ?? null,
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
          Main unit is required. Enter multipliers and units only for the levels you need.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <SelectInput
          label="Main Unit"
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
            hint="Optional — e.g. 120"
          />
          <SelectInput
            label="Intermediate Unit"
            value={form.intermediateUnitId ?? OPTIONAL_UNIT}
            options={optionalOptions}
            onChange={(e) => setUnitField("intermediate", e.target.value)}
            hint="Optional — e.g. Packet, Dozen"
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
            hint="Optional — e.g. 70"
          />
          <SelectInput
            label="Final Unit"
            value={form.finalUnitId ?? OPTIONAL_UNIT}
            options={optionalOptions}
            onChange={(e) => setUnitField("final", e.target.value)}
            hint="Optional — e.g. Pieces, Gram"
          />
        </div>

        <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
            Conversion Preview
          </p>
          <p className="mt-2 text-sm leading-relaxed text-corporate-text">{chainSummary}</p>
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
