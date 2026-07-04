"use client";

import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import {
  getGroupById,
  getGroupForModule,
  getMasterPanelModule,
  MASTER_PANEL_MODULE_GROUPS,
  type MasterPanelModuleGroupId,
  type MasterPanelModuleId,
} from "@/constants/master-panel-modules";
import { cn } from "@/lib/utils";

type MasterPanelManagerNavProps = {
  activeModuleId: MasterPanelModuleId;
  onSelect: (id: MasterPanelModuleId) => void;
};

export default function MasterPanelManagerNav({
  activeModuleId,
  onSelect,
}: MasterPanelManagerNavProps) {
  const activeModule = getMasterPanelModule(activeModuleId);
  const moduleGroup = getGroupForModule(activeModuleId);
  const [activeGroupId, setActiveGroupId] = useState<MasterPanelModuleGroupId>(
    moduleGroup?.id ?? "administration"
  );

  useEffect(() => {
    const nextGroup = getGroupForModule(activeModuleId);
    if (nextGroup?.id) {
      setActiveGroupId(nextGroup.id);
    }
  }, [activeModuleId]);

  const activeGroup = getGroupById(activeGroupId) ?? MASTER_PANEL_MODULE_GROUPS[0];

  return (
    <nav
      className="sticky top-4 rounded-xl border border-corporate-border bg-corporate-surface shadow-card"
      aria-label="ERP module navigation"
    >
      <div className="border-b border-corporate-border px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 shrink-0 text-corporate-brand" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
              ERP Modules
            </p>
            <p className="text-xs text-corporate-muted">
              Select a group, then pick a module
            </p>
          </div>
        </div>
        {activeModule && (
          <p className="mt-2 truncate text-xs font-medium text-corporate-text">
            Active: {activeModule.navLabel}
          </p>
        )}
      </div>

      <div className="p-4">
        <div
          className="mb-4 flex flex-col gap-2 sm:flex-row"
          role="tablist"
          aria-label="ERP module groups"
        >
          {MASTER_PANEL_MODULE_GROUPS.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveGroupId(group.id)}
                className={cn(
                  "flex-1 rounded-full border px-4 py-2.5 text-center text-sm font-semibold transition-colors",
                  isActive
                    ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                    : "border-corporate-border bg-corporate-bg text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
                )}
              >
                <span className="block">{group.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs font-normal",
                    isActive ? "text-white/85" : "text-corporate-muted"
                  )}
                >
                  {group.description}
                </span>
              </button>
            );
          })}
        </div>

        <ul
          className="flex flex-col gap-2"
          role="list"
          aria-label={`${activeGroup?.label ?? "Group"} modules`}
        >
          {(activeGroup?.moduleIds ?? []).map((moduleId) => {
            const panelModule = getMasterPanelModule(moduleId);
            if (!panelModule) return null;

            const isActive = moduleId === activeModuleId;
            const Icon = panelModule.icon;

            return (
              <li key={moduleId}>
                <button
                  type="button"
                  onClick={() => onSelect(moduleId)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-full border px-4 py-2.5 text-left text-sm font-medium transition-all",
                    isActive
                      ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                      : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{panelModule.navLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
