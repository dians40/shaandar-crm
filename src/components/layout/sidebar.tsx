"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronDown, LogOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sidebarNavItems } from "@/constants/nav-config";
import {
  getGroupById,
  getMasterPanelModule,
  isMasterPanelModuleId,
  MASTER_PANEL_MODULE_GROUPS,
  type MasterPanelModuleGroupId,
  type MasterPanelModuleId,
} from "@/constants/master-panel-modules";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/login/actions";
import { useUserPermissions } from "@/contexts/user-permissions-context";

type ExpandableSectionId = "master-panel" | "transactions";

const EXPANDABLE_SECTIONS: Record<
  ExpandableSectionId,
  { href: string; groupId: MasterPanelModuleGroupId }
> = {
  "master-panel": { href: "/master-panel", groupId: "administration" },
  transactions: { href: "/transactions", groupId: "transaction" },
};

function getExpandableSectionForPath(pathname: string): ExpandableSectionId | null {
  if (pathname.startsWith("/master-panel")) return "master-panel";
  if (pathname.startsWith("/transactions")) return "transactions";
  return null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedRole, canViewMasterPanelModule } = useUserPermissions();
  const activeModuleParam = searchParams.get("module");

  const activeModuleId = isMasterPanelModuleId(activeModuleParam)
    ? activeModuleParam
    : null;

  const pathSection = getExpandableSectionForPath(pathname);

  const [expandedSections, setExpandedSections] = useState<
    Record<ExpandableSectionId, boolean>
  >({
    "master-panel": pathSection === "master-panel",
    transactions: pathSection === "transactions",
  });

  useEffect(() => {
    const section = getExpandableSectionForPath(pathname);
    if (section) {
      setExpandedSections((current) => ({ ...current, [section]: true }));
    }
  }, [pathname]);

  const toggleSection = useCallback((sectionId: ExpandableSectionId) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  const nestedModules = useMemo(
    () =>
      ({
        "master-panel": (getGroupById("administration")?.moduleIds ?? []).filter((moduleId) =>
          canViewMasterPanelModule(selectedRole, moduleId)
        ),
        transactions: (getGroupById("transaction")?.moduleIds ?? []).filter((moduleId) =>
          canViewMasterPanelModule(selectedRole, moduleId)
        ),
      }) satisfies Record<ExpandableSectionId, MasterPanelModuleId[]>,
    [canViewMasterPanelModule, selectedRole]
  );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-corporate-border bg-corporate-surface">
      <div className="flex items-center gap-3 border-b border-corporate-border px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-corporate-brand-light text-corporate-brand">
          <Building2 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-corporate-text">
            Shaandar CRM
          </p>
          <p className="text-xs text-corporate-muted">Corporate Suite</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {sidebarNavItems.map((item) => {
            const expandableKey = Object.entries(EXPANDABLE_SECTIONS).find(
              ([, config]) => config.href === item.href
            )?.[0] as ExpandableSectionId | undefined;

            if (expandableKey) {
              const sectionConfig = EXPANDABLE_SECTIONS[expandableKey];
              const isSectionActive = pathname.startsWith(sectionConfig.href);
              const isExpanded = expandedSections[expandableKey];
              const Icon = item.icon;
              const group = MASTER_PANEL_MODULE_GROUPS.find(
                (entry) => entry.id === sectionConfig.groupId
              );

              return (
                <li key={item.href}>
                  <div
                    className={cn(
                      "rounded-lg transition-colors",
                      isSectionActive && "bg-corporate-brand-light/60"
                    )}
                  >
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        onClick={() =>
                          setExpandedSections((current) => ({
                            ...current,
                            [expandableKey]: !current[expandableKey],
                          }))
                        }
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isSectionActive
                            ? "text-corporate-brand"
                            : "text-corporate-muted hover:bg-corporate-bg hover:text-corporate-text"
                        )}
                        aria-current={isSectionActive ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleSection(expandableKey)}
                        className={cn(
                          "mr-2 rounded-md p-1.5 text-corporate-muted transition-colors hover:bg-corporate-bg hover:text-corporate-text",
                          isExpanded && "text-corporate-brand"
                        )}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label} modules`}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded ? "rotate-0" : "-rotate-90"
                          )}
                          aria-hidden
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <ul
                        className="space-y-0.5 pb-2 pl-3"
                        aria-label={`${group?.label ?? item.label} modules`}
                      >
                        {nestedModules[expandableKey].map((moduleId) => {
                          const panelModule = getMasterPanelModule(moduleId);
                          if (!panelModule) return null;

                          const moduleHref = `${sectionConfig.href}?module=${moduleId}`;
                          const isModuleActive =
                            isSectionActive && activeModuleId === moduleId;
                          const ModuleIcon = panelModule.icon;

                          return (
                            <li key={moduleId}>
                              <Link
                                href={moduleHref}
                                className={cn(
                                  "flex items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-medium transition-all",
                                  isModuleActive
                                    ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                                    : "border-transparent text-corporate-muted hover:border-corporate-border hover:bg-corporate-bg hover:text-corporate-text"
                                )}
                                aria-current={isModuleActive ? "page" : undefined}
                              >
                                <ModuleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                <span className="truncate">{panelModule.navLabel}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            }

            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-corporate-brand-light text-corporate-brand"
                      : "text-corporate-muted hover:bg-corporate-bg hover:text-corporate-text"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-corporate-border p-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-corporate-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
