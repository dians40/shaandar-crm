import {
  LAYER2_STAGING_ALLOWED_PATH_PREFIXES,
  LAYER2_STAGING_WORKSPACE_MODULE,
  type AuthSessionPayload,
  isLayer2StagingUser,
} from "@/types/auth-session";
import type { MasterPanelModuleId } from "@/constants/master-panel-modules";
import { sidebarNavItems } from "@/constants/nav-config";

export const LAYER2_STAGING_HOME_HREF = `/transactions?module=${LAYER2_STAGING_WORKSPACE_MODULE}`;

export function getPostLoginRedirect(session: AuthSessionPayload): string {
  if (isLayer2StagingUser(session)) {
    return LAYER2_STAGING_HOME_HREF;
  }
  return "/dashboard";
}

export function isLayer2StagingPathAllowed(pathname: string, moduleParam: string | null): boolean {
  const pathAllowed = LAYER2_STAGING_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!pathAllowed) return false;
  if (!moduleParam) return true;
  return moduleParam === LAYER2_STAGING_WORKSPACE_MODULE;
}

export function filterSidebarNavForSession(
  session: AuthSessionPayload | null
): typeof sidebarNavItems {
  if (!session || !isLayer2StagingUser(session)) {
    return sidebarNavItems;
  }
  return sidebarNavItems.filter((item) => item.href === "/transactions");
}

export function filterTransactionModulesForSession(
  moduleIds: MasterPanelModuleId[],
  session: AuthSessionPayload | null
): MasterPanelModuleId[] {
  if (!session || !isLayer2StagingUser(session)) {
    return moduleIds;
  }
  return moduleIds.filter((id) => id === LAYER2_STAGING_WORKSPACE_MODULE);
}
