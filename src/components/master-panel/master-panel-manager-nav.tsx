"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
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
  const [viewGroupId, setViewGroupId] = useState<MasterPanelModuleGroupId>(
    moduleGroup?.id ?? "administration"
  );

  useEffect(() => {
    const nextGroup = getGroupForModule(activeModuleId);
    if (nextGroup?.id) {
      setViewGroupId(nextGroup.id);
    }
  }, [activeModuleId]);

  const viewGroup = getGroupById(viewGroupId) ?? MASTER_PANEL_MODULE_GROUPS[0];
  const ActiveIcon = activeModule?.icon;

  return (
    <div className="space-y-3 rounded-xl border border-corporate-border bg-corporate-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-corporate-brand" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
              ERP Navigation
            </p>
            <p className="text-sm text-corporate-muted">
              Two-group executive layout — only the selected module workspace loads.
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

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="ERP module groups"
      >
        {MASTER_PANEL_MODULE_GROUPS.map((group) => {
          const isActive = group.id === viewGroupId;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setViewGroupId(group.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors",
                isActive
                  ? "bg-corporate-brand text-white"
                  : "bg-corporate-bg text-corporate-text hover:bg-corporate-border/40"
              )}
            >
              <span>{group.label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-xs font-normal",
                  isActive ? "text-white/80" : "text-corporate-muted"
                )}
              >
                {group.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-xl">
        <label htmlFor="master-panel-module-select" className="sr-only">
          Select {viewGroup?.label ?? "module"}
        </label>
        <select
          id="master-panel-module-select"
          value={activeModuleId}
          onChange={(e) => onSelect(e.target.value as MasterPanelModuleId)}
          className="w-full appearance-none rounded-lg border border-corporate-border bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-corporate-text focus:border-corporate-brand focus:outline-none focus:ring-2 focus:ring-corporate-brand/20"
        >
          {(viewGroup?.moduleIds ?? []).map((moduleId) => {
            const panelModule = getMasterPanelModule(moduleId);
            if (!panelModule) return null;
            return (
              <option key={moduleId} value={moduleId}>
                {panelModule.navLabel}
              </option>
            );
          })}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
          aria-hidden
        />
      </div>

      <div
        className="flex flex-wrap gap-1.5 border-t border-corporate-border pt-3"
        role="tablist"
        aria-label={`${viewGroup?.label ?? "Group"} modules`}
      >
        <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-corporate-muted">
          {viewGroup?.label ?? "Modules"}
        </span>
        {(viewGroup?.moduleIds ?? []).map((moduleId) => {
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
