"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import {
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

type ExpandedGroups = Record<MasterPanelModuleGroupId, boolean>;

const DEFAULT_EXPANDED: ExpandedGroups = {
  administration: true,
  transaction: false,
};

export default function MasterPanelManagerNav({
  activeModuleId,
  onSelect,
}: MasterPanelManagerNavProps) {
  const activeModule = getMasterPanelModule(activeModuleId);
  const [expandedGroups, setExpandedGroups] =
    useState<ExpandedGroups>(DEFAULT_EXPANDED);

  useEffect(() => {
    const group = getGroupForModule(activeModuleId);
    if (group?.id) {
      setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
    }
  }, [activeModuleId]);

  const toggleGroup = (groupId: MasterPanelModuleGroupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

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
              Expand a group to browse modules
            </p>
          </div>
        </div>
        {activeModule && (
          <p className="mt-2 truncate text-xs font-medium text-corporate-text">
            Active: {activeModule.navLabel}
          </p>
        )}
      </div>

      <div className="p-2">
        {MASTER_PANEL_MODULE_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? false;

          return (
            <div key={group.id} className="mb-1">
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`accordion-panel-${group.id}`}
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isExpanded
                    ? "bg-corporate-brand/10 text-corporate-brand"
                    : "text-corporate-text hover:bg-corporate-bg"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{group.label}</span>
                  <span className="block text-xs font-normal text-corporate-muted">
                    {group.description}
                  </span>
                </span>
              </button>

              {isExpanded && (
                <ul
                  id={`accordion-panel-${group.id}`}
                  className="mt-1 space-y-0.5 pb-2 pl-2"
                  role="list"
                >
                  {(group.moduleIds ?? []).map((moduleId) => {
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
                            "flex w-full items-center gap-2 rounded-lg py-2 pl-6 pr-3 text-left text-sm transition-colors",
                            isActive
                              ? "bg-corporate-brand font-medium text-white"
                              : "text-corporate-text hover:bg-corporate-bg"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{panelModule.navLabel}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
