"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import {
  getMasterPanelModule,
  MASTER_PANEL_MODULE_GROUPS,
  type MasterPanelModuleId,
} from "@/constants/master-panel-modules";
import { cn } from "@/lib/utils";

type MasterPanelManagerNavProps = {
  activeModuleId: MasterPanelModuleId;
  onSelect: (id: MasterPanelModuleId) => void;
};

function findGroupForModule(moduleId: MasterPanelModuleId) {
  return (
    MASTER_PANEL_MODULE_GROUPS.find((group) =>
      group.moduleIds.includes(moduleId)
    ) ?? MASTER_PANEL_MODULE_GROUPS[0]
  );
}

export default function MasterPanelManagerNav({
  activeModuleId,
  onSelect,
}: MasterPanelManagerNavProps) {
  const activeModule = getMasterPanelModule(activeModuleId);
  const activeGroup = findGroupForModule(activeModuleId);
  const ActiveIcon = activeModule?.icon;

  return (
    <div className="space-y-3 rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
              Manager Settings
            </p>
            <p className="text-sm text-corporate-muted">
              Select a module — only its workspace loads below.
            </p>
          </div>
        </div>
        {ActiveIcon && activeModule && (
          <div className="hidden items-center gap-2 rounded-lg bg-corporate-bg px-3 py-1.5 text-sm text-corporate-text sm:flex">
            <ActiveIcon className="h-4 w-4 text-corporate-brand" aria-hidden />
            <span className="font-medium">{activeModule.navLabel}</span>
          </div>
        )}
      </div>

      <div className="relative max-w-xl">
        <label htmlFor="master-panel-module-select" className="sr-only">
          Select module
        </label>
        <select
          id="master-panel-module-select"
          value={activeModuleId}
          onChange={(e) => onSelect(e.target.value as MasterPanelModuleId)}
          className="w-full appearance-none rounded-lg border border-corporate-border bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-corporate-text focus:border-corporate-brand focus:outline-none focus:ring-2 focus:ring-corporate-brand/20"
        >
          {MASTER_PANEL_MODULE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.moduleIds.map((moduleId) => {
                const panelModule = getMasterPanelModule(moduleId);
                if (!panelModule) return null;
                return (
                  <option key={moduleId} value={moduleId}>
                    {panelModule.navLabel}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
          aria-hidden
        />
      </div>

      <div
        className="flex flex-wrap gap-1.5 border-t border-corporate-border pt-3"
        role="tablist"
        aria-label={`${activeGroup.label} sub-settings`}
      >
        <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-corporate-muted">
          {activeGroup.label}
        </span>
        {activeGroup.moduleIds.map((moduleId) => {
          const panelModule = getMasterPanelModule(moduleId);
          if (!panelModule) return null;
          const isActive = moduleId === activeModuleId;
          const Icon = panelModule.icon;

          return (
            <button
              key={moduleId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(moduleId)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-corporate-brand text-white"
                  : "bg-corporate-bg text-corporate-text hover:bg-corporate-border/40"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {panelModule.navLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
