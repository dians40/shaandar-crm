"use client";

import { useActiveEmployeeSubHeader } from "@/hooks/use-active-employee-sub-header";

export default function MasterPanelEmployeeSubHeader() {
  const session = useActiveEmployeeSubHeader();

  if (!session) return null;

  const prefix =
    session.mode === "add" ? "Adding New Employee:" : "Editing Employee:";

  return (
    <div
      className="-mt-2 mb-4 border-b border-corporate-border/70 pb-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-sm font-medium text-corporate-text">
        {prefix}{" "}
        <span className="font-semibold text-corporate-brand">
          {session.activeEmployeeName}
        </span>
      </p>
    </div>
  );
}
