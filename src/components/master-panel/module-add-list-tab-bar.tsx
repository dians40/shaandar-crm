"use client";

import { cn } from "@/lib/utils";

export type ModuleAddListTab = "list" | "add";

type Props = {
  moduleName: string;
  active: ModuleAddListTab;
  onList: () => void;
  onAdd: () => void;
};

/** Standard Administration top-bar: Add [Module] + List */
export default function ModuleAddListTabBar({
  moduleName,
  active,
  onList,
  onAdd,
}: Props) {
  return (
    <div
      className="mb-4 flex flex-wrap gap-2"
      role="tablist"
      aria-label={`${moduleName} workspace views`}
    >
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
        Add {moduleName}
      </button>
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
    </div>
  );
}
