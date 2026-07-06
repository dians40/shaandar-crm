"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IMPLEMENTED_ADMINISTRATION_MODULE_IDS } from "@/constants/administration-modules";
import { IMPLEMENTED_TRANSACTION_MODULE_IDS } from "@/constants/transaction-modules";
import {
  DEFAULT_MASTER_PANEL_MODULE_ID,
  DEFAULT_TRANSACTION_MODULE_ID,
  getGroupForModule,
  getMasterPanelModule,
  getModuleWorkspaceHref,
  isMasterPanelModuleId,
  type MasterPanelModuleGroupId,
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
import ExpenseReceiptPanel from "./expense-receipt-panel";
import JournalEntryPanel from "./journal-entry-panel";
import TransferVoucherPanel from "./transfer-voucher-panel";
import PartsOrderPanel from "./parts-order-panel";
import ManualAttendanceEntryPanel from "./manual-attendance-entry-panel";
import { INVENTORY_VOUCHER_CONFIGS } from "@/constants/inventory-voucher-configs";
import { EXPENSE_RECEIPT_CONFIGS } from "@/constants/accounting-voucher-configs";

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

function resolveDefaultModuleId(
  scope: MasterPanelModuleGroupId,
  moduleParam: string | null
): MasterPanelModuleId {
  if (isMasterPanelModuleId(moduleParam)) {
    const moduleGroup = getGroupForModule(moduleParam);
    if (moduleGroup?.id === scope) {
      return moduleParam;
    }
  }

  return scope === "transaction"
    ? DEFAULT_TRANSACTION_MODULE_ID
    : DEFAULT_MASTER_PANEL_MODULE_ID;
}

type MasterPanelContentProps = {
  scope: MasterPanelModuleGroupId;
};

function MasterPanelContent({ scope }: MasterPanelContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get("module");

  const [activeModuleId, setActiveModuleId] = useState<MasterPanelModuleId>(() =>
    resolveDefaultModuleId(scope, moduleParam)
  );
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0);
  const activeModuleIdRef = useRef(activeModuleId);
  activeModuleIdRef.current = activeModuleId;

  const activeModule = useMemo(
    () =>
      getMasterPanelModule(activeModuleId) ??
      getMasterPanelModule(
        scope === "transaction"
          ? DEFAULT_TRANSACTION_MODULE_ID
          : DEFAULT_MASTER_PANEL_MODULE_ID
      ),
    [activeModuleId, scope]
  );

  const navigateToModule = useCallback(
    (id: MasterPanelModuleId, syncUrl = true) => {
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

      if (syncUrl) {
        router.replace(getModuleWorkspaceHref(id), { scroll: false });
      }
    },
    [router]
  );

  useEffect(() => {
    const nextModuleId = resolveDefaultModuleId(scope, moduleParam);
    if (nextModuleId !== activeModuleIdRef.current) {
      navigateToModule(nextModuleId, false);
    }
  }, [moduleParam, navigateToModule, scope]);

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
          Select a module from the left navigation tree to begin.
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
        case "attendance-manual-entry":
          return <ManualAttendanceEntryPanel />;
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
        case "expenses":
          return <ExpenseReceiptPanel config={EXPENSE_RECEIPT_CONFIGS.expenses} />;
        case "receipt":
          return <ExpenseReceiptPanel config={EXPENSE_RECEIPT_CONFIGS.receipt} />;
        case "journal-entry":
          return <JournalEntryPanel />;
        case "inventory-transfer":
          return <TransferVoucherPanel />;
        case "parts-order":
          return <PartsOrderPanel />;
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
    <section
      className="flex min-w-0 flex-1 flex-col"
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
      <div key={`${workspaceEpoch}-${activeModuleId}`} className="min-w-0 flex-1">
        {renderModuleWorkspace()}
      </div>
    </section>
  );
}

function MasterPanelWorkspaceFallback() {
  return (
    <div className="rounded-xl border border-corporate-border bg-corporate-surface p-6 text-sm text-corporate-muted">
      Loading workspace...
    </div>
  );
}

type MasterPanelViewProps = {
  scope?: MasterPanelModuleGroupId;
};

export default function MasterPanelView({
  scope = "administration",
}: MasterPanelViewProps) {
  return (
    <MasterPanelErrorBoundary>
      <Suspense fallback={<MasterPanelWorkspaceFallback />}>
        <MasterPanelContent scope={scope} />
      </Suspense>
    </MasterPanelErrorBoundary>
  );
}
