"use client";

import {
  Component,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_MASTER_PANEL_MODULE_ID,
  getMasterPanelModule,
  MASTER_PANEL_MODULES,
  type MasterPanelModuleId,
} from "@/constants/master-panel-modules";
import { cn } from "@/lib/utils";
import EmployeeManagementPanel from "./employee-management-panel";
import ModulePlaceholder from "./module-placeholder";

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class MasterPanelErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message:
        error?.message || "Something went wrong while loading the Master Panel.",
    };
  }

  componentDidCatch(error: Error) {
    console.error("MasterPanelView crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
          role="alert"
        >
          <p className="font-semibold">Master Panel could not be loaded</p>
          <p className="mt-2">{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ErpModuleNav({
  activeModuleId,
  onSelect,
}: {
  activeModuleId: MasterPanelModuleId;
  onSelect: (id: MasterPanelModuleId) => void;
}) {
  return (
    <nav
      className="rounded-xl border border-corporate-border bg-corporate-surface shadow-card"
      aria-label="Serialized ERP workflow modules"
    >
      <div className="border-b border-corporate-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
          ERP Workflow Track
        </p>
        <p className="mt-0.5 text-sm text-corporate-muted">
          Serialized modules 1–20 (Employee Management stays active above)
        </p>
      </div>
      <ol className="divide-y divide-corporate-border">
        {MASTER_PANEL_MODULES.map((module) => {
          const Icon = module.icon;
          const isActive = module.id === activeModuleId;

          return (
            <li key={module.id}>
              <button
                type="button"
                onClick={() => onSelect(module.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  isActive
                    ? "bg-corporate-brand-light/70"
                    : "hover:bg-corporate-bg/70"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isActive
                      ? "bg-corporate-brand text-white"
                      : "bg-corporate-bg text-corporate-muted"
                  )}
                >
                  {module.serial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-corporate-brand" : "text-corporate-muted"
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-corporate-brand" : "text-corporate-text"
                      )}
                    >
                      {module.title}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-corporate-muted">
                    {module.subtitle}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function MasterPanelContent() {
  const [activeModuleId, setActiveModuleId] = useState<MasterPanelModuleId>(
    DEFAULT_MASTER_PANEL_MODULE_ID
  );

  const activeModule = useMemo(
    () =>
      getMasterPanelModule(activeModuleId) ??
      getMasterPanelModule(DEFAULT_MASTER_PANEL_MODULE_ID)!,
    [activeModuleId]
  );

  const handleModuleSelect = useCallback((id: MasterPanelModuleId) => {
    setActiveModuleId(id);
    if (id === "employee-management") {
      document
        .getElementById("employee-management-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const renderErpModulePreview = () => {
    if (activeModule.id === "employee-management") {
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <p className="font-semibold">Module 1 — Employee Management is active</p>
          <p className="mt-1">
            The full Employee Management workspace (search, bio-data, forms, and
            attendance delete protection) is running in the section above.
          </p>
        </div>
      );
    }

    try {
      return <ModulePlaceholder module={activeModule} />;
    } catch (error) {
      console.error(`ERP module preview failed (${activeModule.id}):`, error);
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to preview {activeModule.title}. Please select another module.
        </div>
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* PRIMARY — fully restored Employee Management (always visible) */}
      <section
        id="employee-management-section"
        className="space-y-4"
        aria-label="Employee Management"
      >
        <div className="rounded-xl border border-corporate-border bg-corporate-surface px-4 py-3 shadow-card sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
            Module 1 — Active Workspace
          </p>
          <h2 className="mt-1 text-lg font-semibold text-corporate-text">
            Employee Management
          </h2>
          <p className="text-sm text-corporate-muted">
            Add Employee / Assign Godown — search, bio-data, forms, attendance
            protection
          </p>
        </div>
        <EmployeeManagementPanel />
      </section>

      {/* APPENDED — serialized ERP workflow navigation & module previews */}
      <section className="space-y-4" aria-label="ERP workflow track">
        <div className="rounded-xl border border-corporate-border bg-corporate-surface px-4 py-3 shadow-card sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
            CRM & ERP Serialized Track
          </p>
          <h2 className="mt-1 text-lg font-semibold text-corporate-text">
            Enterprise Module Navigation
          </h2>
          <p className="text-sm text-corporate-muted">
            Select any module below — Employee Management remains untouched above
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <ErpModuleNav
            activeModuleId={activeModule.id}
            onSelect={handleModuleSelect}
          />
          <div className="min-w-0" aria-label={`${activeModule.title} preview`}>
            {renderErpModulePreview()}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MasterPanelView() {
  return (
    <MasterPanelErrorBoundary>
      <MasterPanelContent />
    </MasterPanelErrorBoundary>
  );
}
