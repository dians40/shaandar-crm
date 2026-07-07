import {
  LAYER2_STAGING_ALLOWED_API_PATH_PREFIXES,
  LAYER2_STAGING_ALLOWED_PATH_PREFIXES,
  LAYER2_STAGING_WORKSPACE_MODULE,
  LAYER3_WORKFLOW_ALLOWED_API_PATH_PREFIXES,
  LAYER4_SAVED_ALLOWED_API_PATH_PREFIXES,
  type AuthSessionPayload,
  getRestrictedAttendanceMode,
  isRestrictedAttendanceUser,
} from "@/types/auth-session";
import type { MasterPanelModuleId } from "@/constants/master-panel-modules";
import { sidebarNavItems } from "@/constants/nav-config";

export const RESTRICTED_ATTENDANCE_HOME_HREF = `/transactions?module=${LAYER2_STAGING_WORKSPACE_MODULE}`;

/** @deprecated Use RESTRICTED_ATTENDANCE_HOME_HREF — kept for existing imports. */
export const LAYER2_STAGING_HOME_HREF = RESTRICTED_ATTENDANCE_HOME_HREF;

export function getPostLoginRedirect(session: AuthSessionPayload): string {
  if (isRestrictedAttendanceUser(session)) {
    return RESTRICTED_ATTENDANCE_HOME_HREF;
  }
  return "/dashboard";
}

export function isRestrictedAttendancePathAllowed(
  pathname: string,
  moduleParam: string | null
): boolean {
  const onTransactions =
    pathname === "/transactions" || pathname.startsWith("/transactions/");

  if (!onTransactions) {
    return false;
  }

  const pathAllowed = LAYER2_STAGING_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!pathAllowed) {
    return false;
  }

  return moduleParam === LAYER2_STAGING_WORKSPACE_MODULE;
}

/** @deprecated Use isRestrictedAttendancePathAllowed */
export function isLayer2StagingPathAllowed(
  pathname: string,
  moduleParam: string | null
): boolean {
  return isRestrictedAttendancePathAllowed(pathname, moduleParam);
}

export function isRestrictedAttendanceApiPathAllowed(
  pathname: string,
  session: AuthSessionPayload
): boolean {
  const mode = getRestrictedAttendanceMode(session);
  if (!mode) return true;

  const prefixes =
    mode === "stagingOnly"
      ? LAYER2_STAGING_ALLOWED_API_PATH_PREFIXES
      : mode === "workflowOnly"
        ? LAYER3_WORKFLOW_ALLOWED_API_PATH_PREFIXES
        : LAYER4_SAVED_ALLOWED_API_PATH_PREFIXES;

  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** @deprecated Use isRestrictedAttendanceApiPathAllowed */
export function isLayer2StagingApiPathAllowed(pathname: string): boolean {
  return LAYER2_STAGING_ALLOWED_API_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function filterSidebarNavForSession(
  session: AuthSessionPayload | null
): typeof sidebarNavItems {
  if (!session || !isRestrictedAttendanceUser(session)) {
    return sidebarNavItems;
  }
  return sidebarNavItems.filter((item) => item.href === "/transactions");
}

export function filterTransactionModulesForSession(
  moduleIds: MasterPanelModuleId[],
  session: AuthSessionPayload | null
): MasterPanelModuleId[] {
  if (!session || !isRestrictedAttendanceUser(session)) {
    return moduleIds;
  }
  return moduleIds.filter((id) => id === LAYER2_STAGING_WORKSPACE_MODULE);
}
