"use client";

import { useCallback, useState } from "react";
import { Construction } from "lucide-react";
import { TextInput } from "@/components/forms/form-fields";
import { useMasterPanelBlockReset } from "@/hooks/use-master-panel-block-reset";
import { LIST_SEARCH_EMPTY_MESSAGE } from "@/lib/list-search-filter";
import ModuleAddListTabBar from "./module-add-list-tab-bar";
import {
  MASTER_LIST_HEAD_CLASS,
  MASTER_LIST_HEADER_CELL_CLASS,
  MASTER_LIST_TABLE_WRAPPER_CLASS,
  UniversalMasterListShell,
} from "./universal-master-list";

type Props = {
  moduleName: string;
  departmentName: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  placeholderMessage?: string;
};

export default function PackingTransactionStubPanel({
  moduleName,
  departmentName,
  primaryLabel = "Employee Name",
  secondaryLabel = "Work Date",
  placeholderMessage,
}: Props) {
  const [view, setView] = useState<"list" | "add">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const hasSearchQuery = searchQuery.trim().length > 0;

  const resetPanelState = useCallback(() => {
    setView("list");
    setSearchQuery("");
  }, []);

  useMasterPanelBlockReset("transaction", resetPanelState);

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
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>{primaryLabel}</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>{secondaryLabel}</th>
                  <th className={MASTER_LIST_HEADER_CELL_CLASS}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-12 text-center text-sm text-corporate-muted"
                  >
                    <Construction className="mx-auto mb-2 h-6 w-6 opacity-60" aria-hidden />
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
        <div className="space-y-4 rounded-xl border border-corporate-border bg-white p-5">
          <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-surface p-8 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-corporate-brand-light text-corporate-brand">
              <Construction className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-corporate-text">
              Add {moduleName}
            </h2>
            <p className="mt-2 text-sm text-corporate-muted">
              {placeholderMessage ??
                `${moduleName} production and labor entry form is coming soon.`}
            </p>
          </div>
          <TextInput
            label="Department"
            value={departmentName}
            readOnly
            className="bg-corporate-bg"
          />
        </div>
      )}
    </>
  );
}
