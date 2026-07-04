import type { MasterPanelModuleId } from "@/constants/master-panel-modules";

const STORAGE_KEY = "shaandar-crm-master-panel-selection";
export const MASTER_PANEL_NAVIGATE_EVENT = "master-panel:navigate";
export const MASTER_PANEL_ENTITY_SELECTED_EVENT = "master-panel:entity-selected";

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

export function navigateMasterPanelModule(targetModuleId: MasterPanelModuleId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MASTER_PANEL_NAVIGATE_EVENT, { detail: { targetModuleId } })
  );
}
