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
import EmployeeBioDataCard from "./employee-bio-data-card";
import EmployeeForm from "./employee-form";
import EmployeeList from "./employee-list";
import ModulePlaceholder from "./module-placeholder";
import SupabaseSetupBanner from "./supabase-setup-banner";
import { useEmployees } from "@/hooks/use-employees";

type EmployeeViewMode = "list" | "add" | "edit" | "detail";

const EMPTY_EMPLOYEES: never[] = [];

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

function MasterPanelModuleNav({
  activeModuleId,
  onSelect,
}: {
  activeModuleId: MasterPanelModuleId;
  onSelect: (id: MasterPanelModuleId) => void;
}) {
  return (
    <nav
      className="rounded-xl border border-corporate-border bg-corporate-surface shadow-card"
      aria-label="Master Panel ERP modules"
    >
      <div className="border-b border-corporate-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
          CRM & ERP Workflow
        </p>
        <p className="mt-0.5 text-sm text-corporate-muted">
          Serialized module sequence (1–20)
        </p>
      </div>
      <ol className="max-h-[70vh] divide-y divide-corporate-border overflow-y-auto">
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

function EmployeeManagementPanel() {
  const { employees, isLoading, error, reload } = useEmployees();
  const [view, setView] = useState<EmployeeViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedId(null);
  }, []);

  const handleSuccess = useCallback(() => {
    handleBack();
    void reload();
  }, [handleBack, reload]);

  const safeEmployees = Array.isArray(employees) ? employees : EMPTY_EMPLOYEES;

  if (view === "add") {
    return (
      <EmployeeForm mode="add" onBack={handleBack} onSuccess={handleSuccess} />
    );
  }

  if (view === "edit" && selectedId) {
    return (
      <EmployeeForm
        mode="edit"
        employeeId={selectedId}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  if (view === "detail" && selectedId) {
    return (
      <EmployeeBioDataCard
        employeeId={selectedId}
        onBack={handleBack}
        onEdit={() => setView("edit")}
      />
    );
  }

  return (
    <>
      <SupabaseSetupBanner />
      <EmployeeList
        employees={safeEmployees}
        isLoading={isLoading}
        error={error}
        onRetry={() => void reload()}
        onAddNew={() => setView("add")}
        onView={(id) => {
          setSelectedId(typeof id === "string" ? id : null);
          setView("detail");
        }}
        onEdit={(id) => {
          setSelectedId(typeof id === "string" ? id : null);
          setView("edit");
        }}
        onRefresh={() => void reload()}
      />
    </>
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
  }, []);

  const renderModuleContent = () => {
    try {
      if (activeModule.id === "employee-management") {
        return <EmployeeManagementPanel />;
      }

      return <ModulePlaceholder module={activeModule} />;
    } catch (error) {
      console.error(`Module render failed (${activeModule.id}):`, error);
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to load {activeModule.title}. Please select another module.
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-corporate-border bg-corporate-surface px-4 py-3 shadow-card sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-corporate-brand">
          Active Module
        </p>
        <h2 className="mt-1 text-lg font-semibold text-corporate-text">
          {activeModule.serial}. {activeModule.title}
        </h2>
        <p className="text-sm text-corporate-muted">{activeModule.subtitle}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <MasterPanelModuleNav
          activeModuleId={activeModule.id}
          onSelect={handleModuleSelect}
        />
        <section
          className="min-w-0"
          aria-label={`${activeModule.title} workspace`}
        >
          {renderModuleContent()}
        </section>
      </div>
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
