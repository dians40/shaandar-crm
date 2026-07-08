"use client";

import { useMemo } from "react";
import { SelectInput } from "@/components/forms/form-fields";
import { useGeneralSettings } from "@/hooks/use-general-settings";
import { mergeDepartmentOptions } from "@/lib/attendance-department-options";
import type { WorkAssignment } from "@/types/employee-form";

type Props = {
  data: WorkAssignment;
  onChange: (data: WorkAssignment) => void;
};

export default function WorkAssignmentSection({ data, onChange }: Props) {
  const { departmentNames, isReady } = useGeneralSettings();

  const options = useMemo(() => {
    const current = (data.machineAssignment ?? "").trim();
    const merged = mergeDepartmentOptions(
      current ? [current] : [],
      departmentNames
    );
    return merged.map((name) => ({ value: name, label: name }));
  }, [data.machineAssignment, departmentNames]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-corporate-text">
          Work & Department Assignment
        </h2>
        <p className="mt-1 text-sm text-corporate-muted">
          Department assignment is optional during new entry. You can assign or adjust it
          later via Edit.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectInput
          label="Assign Department"
          name="machineAssignment"
          value={data.machineAssignment}
          onChange={(e) =>
            onChange({ ...data, machineAssignment: e.target.value })
          }
          placeholder={isReady ? "Not assigned yet (optional)" : "Loading departments..."}
          options={options}
          hint="Merged list from Department master and attendance upload processing"
        />
      </div>

      <div className="rounded-lg border border-corporate-border bg-corporate-bg px-4 py-3 text-sm text-corporate-muted">
        Selected department will be linked to the employee profile for shift planning
        and production tracking when assigned.
      </div>
    </div>
  );
}
