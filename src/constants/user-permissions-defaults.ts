import type {
  PermissionKey,
  PermissionModuleId,
  RolePermissionMatrix,
  UserRoleName,
} from "@/types/user-permissions";
import { PERMISSION_KEYS, PERMISSION_MODULES, USER_ROLES } from "@/types/user-permissions";

function buildPermissionSet(allEnabled: boolean): Record<PermissionKey, boolean> {
  return PERMISSION_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = allEnabled;
      return accumulator;
    },
    {} as Record<PermissionKey, boolean>
  );
}

export function createDefaultPermissionMatrix(): RolePermissionMatrix {
  return USER_ROLES.reduce((roleAccumulator, role) => {
    roleAccumulator[role] = PERMISSION_MODULES.reduce((moduleAccumulator, module) => {
      moduleAccumulator[module.id] = buildPermissionSet(role === "Super Admin");
      return moduleAccumulator;
    }, {} as Record<PermissionModuleId, Record<PermissionKey, boolean>>);
    return roleAccumulator;
  }, {} as RolePermissionMatrix);
}

export const DEFAULT_ACTIVE_ROLE: UserRoleName = "Super Admin";
