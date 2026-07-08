"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronDown, LogOut, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAuthSession } from "@/contexts/auth-session-context";
import {
  filterSidebarNavForSession,
  filterTransactionModulesForSession,
  RESTRICTED_ATTENDANCE_HOME_HREF,
} from "@/lib/auth-navigation";
import {
  buildReportHref,
  isReportCategoryId,
  isSalaryWagesReportId,
  REPORT_PARENTS,
  type ReportCategoryId,
  type ReportParentId,
} from "@/constants/reports-navigation";
import { LAYER2_STAGING_WORKSPACE_MODULE } from "@/types/auth-session";

type ExpandableSectionId = "master-panel" | "transactions" | "reports";

const EXPANDABLE_SECTIONS: Record<
  ExpandableSectionId,
  { href: string; groupId?: MasterPanelModuleGroupId }
> = {
  "master-panel": { href: "/master-panel", groupId: "administration" },
  transactions: { href: "/transactions", groupId: "transaction" },
  reports: { href: "/report-generated" },
};

function getExpandableSectionForPath(pathname: string): ExpandableSectionId | null {
  if (pathname.startsWith("/master-panel")) return "master-panel";
  if (pathname.startsWith("/transactions")) return "transactions";
  if (pathname.startsWith("/report-generated")) return "reports";
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
  const { session, isRestrictedAttendanceUser: isRestrictedUser } = useAuthSession();
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
    reports: pathSection === "reports",
  });

  const [expandedReportParents, setExpandedReportParents] = useState<
    Record<ReportParentId, boolean>
  >({
    salary: pathSection === "reports",
  });

  const [expandedReportCategories, setExpandedReportCategories] = useState<
    Record<ReportCategoryId, boolean>
  >({
    "salary-wages": pathSection === "reports",
  });

  useEffect(() => {
    const section = getExpandableSectionForPath(pathname);
    if (section) {
      setExpandedSections((current) => ({ ...current, [section]: true }));
    }
  }, [pathname]);

  const activeCategoryId = isReportCategoryId(searchParams.get("category"))
    ? searchParams.get("category")
    : null;

  const activeReportId = isSalaryWagesReportId(searchParams.get("report"))
    ? searchParams.get("report")
    : null;

  useEffect(() => {
    if (!pathname.startsWith("/report-generated")) return;

    setExpandedReportParents((current) => ({ ...current, salary: true }));

    if (activeCategoryId) {
      setExpandedReportCategories((current) => ({
        ...current,
        [activeCategoryId]: true,
      }));
      return;
    }

    if (activeReportId) {
      setExpandedReportCategories((current) => ({ ...current, "salary-wages": true }));
    }
  }, [pathname, activeCategoryId, activeReportId]);

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

  const handleReportParentToggle = useCallback((parentId: ReportParentId) => {
    setExpandedReportParents((current) => ({
      ...current,
      [parentId]: !current[parentId],
    }));
  }, []);

  const handleReportCategoryToggle = useCallback((categoryId: ReportCategoryId) => {
    setExpandedReportCategories((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  }, []);

  const nestedModules = useMemo(
    () =>
      ({
        "master-panel": getGroupById("administration")?.moduleIds ?? [],
        transactions: filterTransactionModulesForSession(
          getGroupById("transaction")?.moduleIds ?? [],
          session
        ),
        reports: [],
      }) satisfies Record<ExpandableSectionId, MasterPanelModuleId[]>,
    [session]
  );

  const visibleNavItems = useMemo(
    () => filterSidebarNavForSession(session),
    [session]
  );

  useEffect(() => {
    if (!isRestrictedUser) return;
    const moduleParam = searchParams.get("module");
    if (!pathname.startsWith("/transactions") || moduleParam !== LAYER2_STAGING_WORKSPACE_MODULE) {
      router.replace(RESTRICTED_ATTENDANCE_HOME_HREF);
    }
  }, [isRestrictedUser, pathname, router, searchParams]);

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-corporate-border bg-corporate-surface md:w-64">
      <div className="border-b border-corporate-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-corporate-brand-light text-corporate-brand">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-corporate-text">
              Shaandar CRM
            </p>
            <p className="text-xs text-corporate-muted">Corporate Suite</p>
            <form action={logoutAction} className="mt-2">
              <button
                type="submit"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-corporate-border bg-corporate-bg px-2.5 py-1.5 text-xs font-semibold text-corporate-muted shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Sign Out
              </button>
            </form>
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
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => {
            const expandableKey = Object.entries(EXPANDABLE_SECTIONS).find(
              ([, config]) => config.href === item.href
            )?.[0] as ExpandableSectionId | undefined;

            if (expandableKey) {
              const sectionConfig = EXPANDABLE_SECTIONS[expandableKey];
              const isSectionActive = pathname.startsWith(sectionConfig.href);
              const isExpanded = expandedSections[expandableKey];
              const Icon = item.icon;
              const group = sectionConfig.groupId
                ? MASTER_PANEL_MODULE_GROUPS.find(
                    (entry) => entry.id === sectionConfig.groupId
                  )
                : undefined;

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

                    {isExpanded && expandableKey === "reports" && (
                      <ul
                        id={`sidebar-section-${expandableKey}`}
                        className="mt-0.5 space-y-1 border-l-2 border-corporate-brand/20 pb-2 pl-3"
                        aria-label="Reports hierarchy"
                      >
                        {REPORT_PARENTS.map((parent) => {
                          const isParentExpanded = expandedReportParents[parent.id];

                          return (
                            <li key={parent.id}>
                              <button
                                type="button"
                                onClick={() => handleReportParentToggle(parent.id)}
                                className={cn(
                                  "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors sm:text-xs",
                                  isParentExpanded
                                    ? "text-corporate-brand"
                                    : "text-corporate-muted hover:bg-corporate-bg hover:text-corporate-text"
                                )}
                                aria-expanded={isParentExpanded}
                                aria-controls={`sidebar-report-parent-${parent.id}`}
                              >
                                <span className="min-w-0 flex-1 truncate">{parent.label}</span>
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 shrink-0 transition-transform",
                                    isParentExpanded ? "rotate-0" : "-rotate-90"
                                  )}
                                  aria-hidden
                                />
                              </button>

                              {isParentExpanded && (
                                <ul
                                  id={`sidebar-report-parent-${parent.id}`}
                                  className="mt-0.5 space-y-1 border-l-2 border-corporate-brand/15 pb-1 pl-3"
                                  aria-label={`${parent.label} categories`}
                                >
                                  {parent.categories.map((category) => {
                                    const isCategoryExpanded =
                                      expandedReportCategories[category.id];

                                    return (
                                      <li key={category.id}>
                                        <button
                                          type="button"
                                          onClick={() => handleReportCategoryToggle(category.id)}
                                          className={cn(
                                            "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors sm:text-xs",
                                            isCategoryExpanded
                                              ? "text-corporate-text"
                                              : "text-corporate-muted hover:bg-corporate-bg hover:text-corporate-text"
                                          )}
                                          aria-expanded={isCategoryExpanded}
                                          aria-controls={`sidebar-report-category-${category.id}`}
                                        >
                                          <span className="min-w-0 flex-1 truncate">
                                            {category.label}
                                          </span>
                                          <ChevronDown
                                            className={cn(
                                              "h-3.5 w-3.5 shrink-0 transition-transform",
                                              isCategoryExpanded ? "rotate-0" : "-rotate-90"
                                            )}
                                            aria-hidden
                                          />
                                        </button>

                                        {isCategoryExpanded && (
                                          <ul
                                            id={`sidebar-report-category-${category.id}`}
                                            className="mt-0.5 space-y-0.5 border-l-2 border-corporate-brand/10 pb-1 pl-3"
                                            aria-label={`${category.label} reports`}
                                          >
                                            {category.reports.map((report) => {
                                              const reportHref = buildReportHref(
                                                report.id,
                                                category.id
                                              );
                                              const isReportActive =
                                                isSectionActive &&
                                                activeReportId === report.id &&
                                                (activeCategoryId === null ||
                                                  activeCategoryId === category.id);
                                              const ReportIcon = report.icon;

                                              return (
                                                <li key={report.id}>
                                                  <Link
                                                    href={reportHref}
                                                    onClick={() => onNavigate?.()}
                                                    className={cn(
                                                      "flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-left text-sm font-medium transition-all sm:text-xs",
                                                      isReportActive
                                                        ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                                                        : "border-transparent text-corporate-muted hover:border-corporate-border hover:bg-corporate-bg hover:text-corporate-text"
                                                    )}
                                                    aria-current={
                                                      isReportActive ? "page" : undefined
                                                    }
                                                  >
                                                    <ReportIcon
                                                      className="h-3.5 w-3.5 shrink-0"
                                                      aria-hidden
                                                    />
                                                    <span className="truncate">{report.label}</span>
                                                  </Link>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {isExpanded && expandableKey !== "reports" && (
                      <ul
                        id={`sidebar-section-${expandableKey}`}
                        className="mt-0.5 space-y-0.5 border-l-2 border-corporate-brand/20 pb-2 pl-3"
                        aria-label={`${group?.label ?? item.label} modules`}
                      >
                        {nestedModules[expandableKey].length === 0 ? (
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
    </aside>
  );
}
