"use client";

import { cn } from "@/lib/utils";

type EmployeeSubTab = "list" | "add";

type Props = {
  active: EmployeeSubTab;
  onList: () => void;
  onAdd: () => void;
};

export default function EmployeeSubTabBar({ active, onList, onAdd }: Props) {
  return (
    <div
      className="mb-4 flex gap-2"
      role="tablist"
      aria-label="Employee workspace views"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "list"}
        onClick={onList}
        className={cn(
          "rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
          active === "list"
            ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
            : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
        )}
      >
        List
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "add"}
        onClick={onAdd}
        className={cn(
          "rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
          active === "add"
            ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
            : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
        )}
      >
        Add Employee
      </button>
    </div>
  );
}
