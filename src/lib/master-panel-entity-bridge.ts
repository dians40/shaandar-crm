import type {
  MasterPanelModuleGroupId,
  MasterPanelModuleId,
} from "@/constants/master-panel-modules";

const STORAGE_KEY = "shaandar-crm-master-panel-selection";
const ACTIVE_EMPLOYEE_STORAGE_KEY = "shaandar-crm-master-panel-active-employee";
export const MASTER_PANEL_NAVIGATE_EVENT = "master-panel:navigate";
export const MASTER_PANEL_ENTITY_SELECTED_EVENT = "master-panel:entity-selected";
export const MASTER_PANEL_BLOCK_RESET_EVENT = "master-panel:block-reset";
export const MASTER_PANEL_ACTIVE_EMPLOYEE_EVENT = "master-panel:active-employee";

export type ActiveEmployeeMode = "add" | "edit";

export type ActiveEmployeeSession = {
  mode: ActiveEmployeeMode;
  /** Display name shown in the Master Panel sub-header */
  activeEmployeeName: string;
  employeeId?: string;
  timestamp: string;
};

export type MasterPanelEntityType =
  | "employee"
  | "account"
  | "account-group"
  | "item"
  | "item-group"
  | "unit"
  | "unit-conversion"
  | "godown"
  | "overtime";

export type MasterPanelEntityRef = {
  entityType: MasterPanelEntityType;
  entityId: string;
  entityName: string;
  sourceModuleId: MasterPanelModuleId;
  targetModuleId?: MasterPanelModuleId;
  timestamp: string;
};

export function selectMasterPanelEntity(
  ref: Omit<MasterPanelEntityRef, "timestamp">
): MasterPanelEntityRef {
  const payload: MasterPanelEntityRef = {
    ...ref,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent(MASTER_PANEL_ENTITY_SELECTED_EVENT, { detail: payload })
    );

    if (ref.targetModuleId) {
      window.dispatchEvent(
        new CustomEvent(MASTER_PANEL_NAVIGATE_EVENT, {
          detail: { targetModuleId: ref.targetModuleId },
        })
      );
    }
  }

  return payload;
}

export function readMasterPanelSelection(): MasterPanelEntityRef | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MasterPanelEntityRef;
    if (!parsed?.entityId || !parsed?.entityType) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMasterPanelSelection() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function dispatchActiveEmployeeSession(session: ActiveEmployeeSession | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MASTER_PANEL_ACTIVE_EMPLOYEE_EVENT, { detail: session })
  );
}

export function setActiveEmployeeSession(
  session: Omit<ActiveEmployeeSession, "timestamp">
): ActiveEmployeeSession {
  const payload: ActiveEmployeeSession = {
    ...session,
    activeEmployeeName: session.activeEmployeeName.trim() || "Drafting...",
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(ACTIVE_EMPLOYEE_STORAGE_KEY, JSON.stringify(payload));
    dispatchActiveEmployeeSession(payload);
  }

  return payload;
}

export function updateActiveEmployeeName(name: string): ActiveEmployeeSession | null {
  const current = readActiveEmployeeSession();
  if (!current) return null;

  const nextName = name.trim() || (current.mode === "add" ? "Drafting..." : "Employee");
  if (nextName === current.activeEmployeeName) return current;

  return setActiveEmployeeSession({
    mode: current.mode,
    activeEmployeeName: nextName,
    employeeId: current.employeeId,
  });
}

export function readActiveEmployeeSession(): ActiveEmployeeSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(ACTIVE_EMPLOYEE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveEmployeeSession;
    if (!parsed?.mode || !parsed.activeEmployeeName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveEmployeeSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACTIVE_EMPLOYEE_STORAGE_KEY);
  dispatchActiveEmployeeSession(null);
}

/** Wipe cross-module entity bridge state when leaving an ERP block. */
export function resetMasterPanelBlockState(
  clearedBlock: MasterPanelModuleGroupId
): void {
  if (typeof window === "undefined") return;
  clearMasterPanelSelection();
  clearActiveEmployeeSession();
  window.dispatchEvent(
    new CustomEvent(MASTER_PANEL_BLOCK_RESET_EVENT, {
      detail: { clearedBlock },
    })
  );
}

export function navigateMasterPanelModule(targetModuleId: MasterPanelModuleId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MASTER_PANEL_NAVIGATE_EVENT, { detail: { targetModuleId } })
  );
}
