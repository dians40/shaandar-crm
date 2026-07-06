import type {
  PermissionKey,
  PermissionModuleId,
  RolePermissionMatrix,
} from "@/types/user-permissions";
import {
  BUILTIN_USER_ROLES,
  getDefaultRolesList,
  PERMISSION_KEYS,
  PERMISSION_MODULES,
} from "@/types/user-permissions";

function buildPermissionSet(allEnabled: boolean): Record<PermissionKey, boolean> {
  return PERMISSION_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = allEnabled;
      return accumulator;
    },
    {} as Record<PermissionKey, boolean>
  );
}

export function buildRolePermissionDefaults(role: string): Record<
  PermissionModuleId,
  Record<PermissionKey, boolean>
> {
  return PERMISSION_MODULES.reduce((moduleAccumulator, module) => {
    moduleAccumulator[module.id] = buildPermissionSet(role === "Super Admin");
    return moduleAccumulator;
  }, {} as Record<PermissionModuleId, Record<PermissionKey, boolean>>);
}

export function createDefaultPermissionMatrix(
  roles: string[] = getDefaultRolesList()
): RolePermissionMatrix {
  return roles.reduce((roleAccumulator, role) => {
    roleAccumulator[role] = buildRolePermissionDefaults(role);
    return roleAccumulator;
  }, {} as RolePermissionMatrix);
}

export const DEFAULT_ACTIVE_ROLE = BUILTIN_USER_ROLES[0];
