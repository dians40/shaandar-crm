"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronDown, LogOut, X } from "lucide-react";
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
import {
  getTransactionNavHref,
  isTransactionNavItemActive,
  TRANSACTIONS_NAV_ITEMS,
} from "@/constants/transactions-nav-config";
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

export default function Sidebar({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleSectionToggle = useCallback(
    (sectionId: ExpandableSectionId, href: string) => {
      setExpandedSections((current) => {
        const willExpand = !current[sectionId];

        if (willExpand && !pathname.startsWith(href)) {
          router.push(href);
        }

        return { ...current, [sectionId]: willExpand };
      });
    },
    [pathname, router]
  );

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
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-corporate-border bg-corporate-surface md:w-64">
      <div className="flex items-center gap-3 border-b border-corporate-border px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-corporate-brand-light text-corporate-brand">
          <Building2 className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-corporate-text">
            Shaandar CRM
          </p>
          <p className="text-xs text-corporate-muted">Corporate Suite</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-corporate-border text-corporate-muted transition-colors hover:bg-corporate-bg md:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
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
                    <button
                      type="button"
                      onClick={() => handleSectionToggle(expandableKey, sectionConfig.href)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium transition-colors sm:text-sm",
                        isSectionActive
                          ? "text-corporate-brand"
                          : "text-corporate-muted hover:bg-corporate-bg hover:text-corporate-text"
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={`sidebar-section-${expandableKey}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          isExpanded ? "rotate-0" : "-rotate-90"
                        )}
                        aria-hidden
                      />
                    </button>

                    {isExpanded && (
                      <ul
                        id={`sidebar-section-${expandableKey}`}
                        className="mt-0.5 space-y-0.5 border-l-2 border-corporate-brand/20 pb-2 pl-3"
                        aria-label={`${group?.label ?? item.label} modules`}
                      >
                        {expandableKey === "transactions"
                          ? TRANSACTIONS_NAV_ITEMS.map((navItem) => {
                              const NavIcon = navItem.icon;
                              const navHref = getTransactionNavHref(navItem);
                              const isNavActive = isTransactionNavItemActive(
                                navItem,
                                pathname,
                                activeModuleId
                              );

                              return (
                                <li key={navItem.id}>
                                  <Link
                                    href={navHref}
                                    onClick={() => onNavigate?.()}
                                    className={cn(
                                      "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all",
                                      isNavActive
                                        ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                                        : "border-transparent text-corporate-muted hover:border-corporate-border hover:bg-corporate-bg hover:text-corporate-text"
                                    )}
                                    aria-current={isNavActive ? "page" : undefined}
                                  >
                                    <NavIcon className="h-4 w-4 shrink-0" aria-hidden />
                                    <span className="min-w-0 flex-1 truncate">
                                      {navItem.label}
                                      <span
                                        className={cn(
                                          "mt-0.5 block truncate text-[11px] font-normal",
                                          isNavActive
                                            ? "text-white/85"
                                            : "text-corporate-muted"
                                        )}
                                      >
                                        {navItem.labelHi}
                                      </span>
                                    </span>
                                  </Link>
                                </li>
                              );
                            })
                          : nestedModules[expandableKey].length === 0 ? (
                          <li className="px-3 py-2 text-xs text-corporate-muted">
                            No modules available for the current role.
                          </li>
                        ) : (
                          nestedModules[expandableKey].map((moduleId) => {
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
                                onClick={() => onNavigate?.()}
                                className={cn(
                                  "flex min-h-11 items-center gap-2 rounded-full border px-3 py-2.5 text-left text-sm font-medium transition-all sm:text-xs",
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
                        })
                        )}
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
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors sm:text-sm",
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
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-corporate-muted transition-colors hover:bg-red-50 hover:text-red-600 sm:text-sm"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
