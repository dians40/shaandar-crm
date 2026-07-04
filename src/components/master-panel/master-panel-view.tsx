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
  type MasterPanelModuleId,
} from "@/constants/master-panel-modules";
import EmployeeManagementPanel from "./employee-management-panel";
import GodownManagementPanel from "./godown-management-panel";
import MasterPanelManagerNav from "./master-panel-manager-nav";
import ModulePlaceholder from "./module-placeholder";
import OvertimeTrackerPanel from "./overtime-tracker-panel";

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

function MasterPanelContent() {
  const [activeModuleId, setActiveModuleId] = useState<MasterPanelModuleId>(
    DEFAULT_MASTER_PANEL_MODULE_ID
  );

  const activeModule = useMemo(
    () =>
      getMasterPanelModule(activeModuleId) ??
      getMasterPanelModule(DEFAULT_MASTER_PANEL_MODULE_ID),
    [activeModuleId]
  );

  const handleModuleSelect = useCallback((id: MasterPanelModuleId) => {
    setActiveModuleId(id);
  }, []);

  const renderModuleWorkspace = () => {
    const moduleId = activeModule?.id;
    if (!moduleId) {
      return (
        <div className="rounded-xl border border-corporate-border bg-corporate-surface p-6 text-sm text-corporate-muted">
          Select a module from Administration or Transaction to begin.
        </div>
      );
    }

    try {
      switch (moduleId) {
        case "employee-management":
          return <EmployeeManagementPanel />;
        case "godowns-locations":
          return <GodownManagementPanel />;
        case "overtime-tracker":
          return <OvertimeTrackerPanel />;
        default:
          return activeModule ? (
            <ModulePlaceholder module={activeModule} />
          ) : null;
      }
    } catch (error) {
      console.error(`Module workspace failed (${moduleId}):`, error);
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to load {activeModule?.title ?? "this module"}. Please try another module.
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <MasterPanelManagerNav
        activeModuleId={activeModuleId}
        onSelect={handleModuleSelect}
      />
      <section
        className="min-w-0"
        aria-label={`${activeModule?.title ?? "Module"} workspace`}
      >
        {activeModule && (
          <div className="mb-4 border-b border-corporate-border pb-3">
            <h2 className="text-base font-semibold text-corporate-text">
              {activeModule.title}
            </h2>
            <p className="text-sm text-corporate-muted">{activeModule.subtitle}</p>
          </div>
        )}
        {renderModuleWorkspace()}
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
