import type { MasterPanelModuleId } from "@/constants/master-panel-modules";

/** Administration modules with full panel implementations (not placeholders). */
export const IMPLEMENTED_ADMINISTRATION_MODULE_IDS = new Set<MasterPanelModuleId>([
  "accounts",
  "account-group",
  "employee-management",
  "godowns-locations",
  "units",
  "unit-conversion",
]);
