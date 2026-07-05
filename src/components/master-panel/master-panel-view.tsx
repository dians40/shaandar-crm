"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IMPLEMENTED_ADMINISTRATION_MODULE_IDS } from "@/constants/administration-modules";
import { IMPLEMENTED_TRANSACTION_MODULE_IDS } from "@/constants/transaction-modules";
import {
  DEFAULT_MASTER_PANEL_MODULE_ID,
  getGroupForModule,
  getMasterPanelModule,
  type MasterPanelModuleId,
} from "@/constants/master-panel-modules";
import {
  MASTER_PANEL_NAVIGATE_EVENT,
  resetMasterPanelBlockState,
} from "@/lib/master-panel-entity-bridge";
import AccountGroupManagementPanel from "./account-group-management-panel";
import AccountsManagementPanel from "./accounts-management-panel";
import AdministrationPlaceholderPanel from "./administration-placeholder-panel";
import EmployeeManagementPanel from "./employee-management-panel";
import GodownManagementPanel from "./godown-management-panel";
import ItemGroupsManagementPanel from "./item-groups-management-panel";
import ItemsManagementPanel from "./items-management-panel";
import MasterPanelManagerNav from "./master-panel-manager-nav";
import ModulePlaceholder from "./module-placeholder";
import OvertimeTrackerPanel from "./overtime-tracker-panel";
import AttendanceSystemPanel from "./attendance-system-panel";
import VehicleManagementTransactionPanel from "./vehicle-management-transaction-panel";
import TransactionPlaceholderPanel from "./transaction-placeholder-panel";
import UnitConversionManagementPanel from "./unit-conversion-management-panel";
import UnitsManagementPanel from "./units-management-panel";
import BillOfSundriesManagementPanel from "./bill-of-sundries-management-panel";
import BomManagementPanel from "./bom-management-panel";
import SalaryComponentManagementPanel from "./salary-component-management-panel";
import VehiclesManagementMasterPanel from "./vehicles-management-master-panel";
import EmployeeGroupManagementPanel from "./employee-group-management-panel";
import ApiIntegrationGatewayPanel from "./api-integration-gateway-panel";
import GeneralSettingsManagementPanel from "./general-settings-management-panel";
import InventoryVoucherPanel from "./inventory-voucher-panel";
import ManufacturingVoucherPanel from "./manufacturing-voucher-panel";
import { INVENTORY_VOUCHER_CONFIGS } from "@/constants/inventory-voucher-configs";

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
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0);
  const activeModuleIdRef = useRef(activeModuleId);
  activeModuleIdRef.current = activeModuleId;

  const activeModule = useMemo(
    () =>
      getMasterPanelModule(activeModuleId) ??
      getMasterPanelModule(DEFAULT_MASTER_PANEL_MODULE_ID),
    [activeModuleId]
  );

  const navigateToModule = useCallback((id: MasterPanelModuleId) => {
    const previousId = activeModuleIdRef.current;
    const previousBlock = getGroupForModule(previousId)?.id;
    const nextBlock = getGroupForModule(id)?.id;

    if (
      previousId !== id &&
      previousBlock &&
      nextBlock &&
      previousBlock !== nextBlock
    ) {
      resetMasterPanelBlockState(previousBlock);
      setWorkspaceEpoch((epoch) => epoch + 1);
    }

    setActiveModuleId(id);
  }, []);

  const handleModuleSelect = useCallback(
    (id: MasterPanelModuleId) => {
      navigateToModule(id);
    },
    [navigateToModule]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ targetModuleId?: MasterPanelModuleId }>)
        .detail;
      if (detail?.targetModuleId) {
        navigateToModule(detail.targetModuleId);
      }
    };

    window.addEventListener(MASTER_PANEL_NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(MASTER_PANEL_NAVIGATE_EVENT, handler);
  }, [navigateToModule]);

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
        case "accounts":
          return <AccountsManagementPanel />;
        case "account-group":
          return <AccountGroupManagementPanel />;
        case "employee-management":
          return <EmployeeManagementPanel />;
        case "godowns-locations":
          return <GodownManagementPanel />;
        case "items-products":
          return <ItemsManagementPanel />;
        case "item-groups":
          return <ItemGroupsManagementPanel />;
        case "units":
          return <UnitsManagementPanel />;
        case "unit-conversion":
          return <UnitConversionManagementPanel />;
        case "bill-of-sundries":
          return <BillOfSundriesManagementPanel />;
        case "bom":
          return <BomManagementPanel />;
        case "salary-component":
          return <SalaryComponentManagementPanel />;
        case "vehicles-management-master":
          return <VehiclesManagementMasterPanel />;
        case "employee-group":
          return <EmployeeGroupManagementPanel />;
        case "general-settings":
          return <GeneralSettingsManagementPanel />;
        case "api-integration-gateway":
          return <ApiIntegrationGatewayPanel />;
        case "attendance-system":
          return <AttendanceSystemPanel />;
        case "overtime-tracker":
          return <OvertimeTrackerPanel />;
        case "vehicle-management-transaction":
          return <VehicleManagementTransactionPanel />;
        case "sales-dispatch":
          return (
            <InventoryVoucherPanel config={INVENTORY_VOUCHER_CONFIGS["sales-dispatch"]} />
          );
        case "sales-return":
          return (
            <InventoryVoucherPanel config={INVENTORY_VOUCHER_CONFIGS["sales-return"]} />
          );
        case "purchase-logs":
          return (
            <InventoryVoucherPanel config={INVENTORY_VOUCHER_CONFIGS["purchase-logs"]} />
          );
        case "purchase-return-order":
          return (
            <InventoryVoucherPanel
              config={INVENTORY_VOUCHER_CONFIGS["purchase-return-order"]}
            />
          );
        case "manufacturing-production":
          return <ManufacturingVoucherPanel />;
        default: {
          const moduleGroup = getGroupForModule(moduleId);
          if (
            moduleGroup?.id === "administration" &&
            !IMPLEMENTED_ADMINISTRATION_MODULE_IDS.has(moduleId) &&
            activeModule
          ) {
            return <AdministrationPlaceholderPanel module={activeModule} />;
          }
          if (
            moduleGroup?.id === "transaction" &&
            !IMPLEMENTED_TRANSACTION_MODULE_IDS.has(moduleId) &&
            activeModule
          ) {
            return <TransactionPlaceholderPanel module={activeModule} />;
          }
          return activeModule ? (
            <ModulePlaceholder module={activeModule} />
          ) : null;
        }
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
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="min-w-0">
        <MasterPanelManagerNav
          activeModuleId={activeModuleId}
          onSelect={handleModuleSelect}
        />
      </aside>
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
        <div key={`${workspaceEpoch}-${activeModuleId}`}>{renderModuleWorkspace()}</div>
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
