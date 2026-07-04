"use client";

import { useState } from "react";
import { Construction } from "lucide-react";
import type { MasterPanelModule } from "@/constants/master-panel-modules";
import { LIST_SEARCH_EMPTY_MESSAGE } from "@/lib/list-search-filter";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import {
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  UniversalMasterListShell,
} from "./universal-master-list";

type Props = {
  module: MasterPanelModule;
};

export default function AdministrationPlaceholderPanel({ module }: Props) {
  const [view, setView] = useState<"list" | "add">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const Icon = module?.icon ?? Construction;
  const moduleName = module?.navLabel ?? "Module";
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <>
      <ModuleAddListTabBar
        moduleName={moduleName}
        active={view}
        onList={() => setView("list")}
        onAdd={() => setView("add")}
      />

      {view === "list" ? (
        <UniversalMasterListShell
          moduleName={moduleName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        >
          <div className={MASTER_LIST_TABLE_WRAPPER_CLASS}>
            <table className="min-w-full divide-y divide-corporate-border">
              <thead className={MASTER_LIST_HEAD_CLASS}>
                <tr>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Name</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={2} className="px-4 py-12 text-center text-sm text-corporate-muted">
                    <Icon className="mx-auto mb-2 h-6 w-6 opacity-60" aria-hidden />
                    {hasSearchQuery
                      ? LIST_SEARCH_EMPTY_MESSAGE
                      : `No ${moduleName.toLowerCase()} records yet. Use Add ${moduleName} when ready.`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UniversalMasterListShell>
      ) : (
        <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-surface p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-corporate-brand-light text-corporate-brand">
            <Construction className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-corporate-text">
            Add {moduleName}
          </h2>
          <p className="mt-2 text-sm text-corporate-muted">
            {module?.placeholderMessage || `${module?.title ?? moduleName} form coming soon`}
          </p>
        </div>
      )}
    </>
  );
}
