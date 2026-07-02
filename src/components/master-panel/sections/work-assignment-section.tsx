"use client";

import { SelectInput } from "@/components/forms/form-fields";
import { MACHINE_OPTIONS } from "@/constants/employee-options";
import type { WorkAssignment } from "@/types/employee-form";

type Props = {
  data: WorkAssignment;
  onChange: (data: WorkAssignment) => void;
};

export default function WorkAssignmentSection({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-corporate-text">
          Work & Machine Assignment
        </h2>
        <p className="mt-1 text-sm text-corporate-muted">
          Machine assignment is optional during new entry. You can assign or adjust it
          later via Edit.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectInput
          label="Machine Assignment"
          name="machineAssignment"
          value={data.machineAssignment}
          onChange={(e) =>
            onChange({ ...data, machineAssignment: e.target.value })
          }
          placeholder="Not assigned yet (optional)"
          options={MACHINE_OPTIONS.filter((m) => m !== "None").map((machine) => ({
              value: machine,
              label: machine,
            }))}
          hint="Optional — assign machine in a later step if needed"
        />
      </div>

      <div className="rounded-lg border border-corporate-border bg-corporate-bg px-4 py-3 text-sm text-corporate-muted">
        Selected machine will be linked to the employee profile for shift planning
        and production tracking when assigned.
      </div>
    </div>
  );
}
