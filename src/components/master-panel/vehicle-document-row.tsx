"use client";

import { SelectInput, TextInput, FileInputField } from "@/components/forms/form-fields";
import {
  VEHICLE_DOCUMENT_LABELS,
  VEHICLE_EXPIRY_ALERT_OPTIONS,
  type VehicleDocumentKey,
  type VehicleDocumentBlock,
} from "@/types/vehicle-master";

type VehicleDocumentRowProps = {
  docKey: VehicleDocumentKey;
  block: VehicleDocumentBlock;
  onChange: (next: VehicleDocumentBlock) => void;
};

export default function VehicleDocumentRow({
  docKey,
  block,
  onChange,
}: VehicleDocumentRowProps) {
  return (
    <div className="rounded-lg border border-corporate-border bg-corporate-bg/50 p-4">
      <p className="mb-3 text-sm font-semibold text-corporate-text">
        {VEHICLE_DOCUMENT_LABELS[docKey]}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput
          label="Expiry / Validity Date"
          type="date"
          value={block.expiryDate}
          onChange={(event) =>
            onChange({ ...block, expiryDate: event.target.value })
          }
        />
        <FileInputField
          label="Upload Document"
          fileName={block.fileName}
          onFileChange={(file) =>
            onChange({ ...block, fileName: file?.name ?? block.fileName })
          }
        />
        <SelectInput
          label="Expiry Alert"
          value={block.expiryAlert}
          placeholder="Select alert timing"
          options={VEHICLE_EXPIRY_ALERT_OPTIONS.map((option) => ({
            value: option,
            label: option,
          }))}
          onChange={(event) =>
            onChange({
              ...block,
              expiryAlert: event.target.value as VehicleDocumentBlock["expiryAlert"],
            })
          }
        />
      </div>
    </div>
  );
}
