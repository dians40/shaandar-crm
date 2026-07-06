"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MasterPanelModuleId } from "@/constants/master-panel-modules";
import { getPermissionModuleForMasterPanel } from "@/constants/user-permissions-map";
import {
  buildRolePermissionDefaults,
  createDefaultPermissionMatrix,
  DEFAULT_ACTIVE_ROLE,
} from "@/constants/user-permissions-defaults";
import {
  renameRoleInManagedUsers,
  reassignManagedUsersFromRole,
} from "@/lib/managed-users-store";
import {
  ACTIVE_ROLE_STORAGE_KEY,
  getDefaultRolesList,
  isProtectedRole,
  PERMISSIONS_STORAGE_KEY,
  ROLES_LIST_STORAGE_KEY,
  type PermissionKey,
  type PermissionModuleId,
  type RolePermissionMatrix,
  type UserRoleName,
} from "@/types/user-permissions";

type UserPermissionsContextValue = {
  matrix: RolePermissionMatrix;
  roles: string[];
  selectedRole: UserRoleName;
  setSelectedRole: (role: UserRoleName) => void;
  setPermission: (
    role: UserRoleName,
    moduleId: PermissionModuleId,
    permission: PermissionKey,
    enabled: boolean
  ) => void;
  addRole: (name: string) => string | null;
  editRole: (currentName: string, nextName: string) => string | null;
  removeRole: (name: string) => string | null;
  canViewModule: (role: UserRoleName, moduleId: PermissionModuleId) => boolean;
  canViewMasterPanelModule: (role: UserRoleName, moduleId: MasterPanelModuleId) => boolean;
};

const UserPermissionsContext = createContext<UserPermissionsContextValue | null>(null);

function readStoredRoles(): string[] {
  if (typeof window === "undefined") return getDefaultRolesList();

  try {
    const raw = window.localStorage.getItem(ROLES_LIST_STORAGE_KEY);
    if (!raw) return getDefaultRolesList();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) return getDefaultRolesList();

    const merged = [...getDefaultRolesList()];
    for (const role of parsed) {
      if (typeof role === "string" && role.trim() && !merged.includes(role.trim())) {
        merged.push(role.trim());
      }
    }
    return merged;
  } catch {
    return getDefaultRolesList();
  }
}

function readStoredMatrix(roles: string[]): RolePermissionMatrix {
  const defaults = createDefaultPermissionMatrix(roles);

  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as RolePermissionMatrix;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function readStoredRole(roles: string[]): UserRoleName {
  if (typeof window === "undefined") return DEFAULT_ACTIVE_ROLE;

  try {
    const raw = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    if (raw && roles.includes(raw)) {
      return raw;
    }
  } catch {
    // fall through
  }

  return DEFAULT_ACTIVE_ROLE;
}

function persistRoles(roles: string[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ROLES_LIST_STORAGE_KEY, JSON.stringify(roles));
  }
}

export function UserPermissionsProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<string[]>(() => getDefaultRolesList());
  const [matrix, setMatrix] = useState<RolePermissionMatrix>(() =>
    createDefaultPermissionMatrix()
  );
  const [selectedRole, setSelectedRoleState] = useState<UserRoleName>(DEFAULT_ACTIVE_ROLE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedRoles = readStoredRoles();
    setRoles(storedRoles);
    setMatrix(readStoredMatrix(storedRoles));
    setSelectedRoleState(readStoredRole(storedRoles));
    setIsHydrated(true);
  }, []);

  const persistMatrix = useCallback((nextMatrix: RolePermissionMatrix) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(nextMatrix));
    }
  }, []);

  const setSelectedRole = useCallback((role: UserRoleName) => {
    setSelectedRoleState(role);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
    }
  }, []);

  const setPermission = useCallback(
    (
      role: UserRoleName,
      moduleId: PermissionModuleId,
      permission: PermissionKey,
      enabled: boolean
    ) => {
      if (isProtectedRole(role)) return;

      setMatrix((current) => {
        const nextMatrix: RolePermissionMatrix = {
          ...current,
          [role]: {
            ...current[role],
            [moduleId]: {
              ...current[role][moduleId],
              [permission]: enabled,
            },
          },
        };
        persistMatrix(nextMatrix);
        return nextMatrix;
      });
    },
    [persistMatrix]
  );

  const addRole = useCallback(
    (name: string): string | null => {
      const trimmed = name.trim();
      if (!trimmed) return "Role name cannot be empty.";
      if (roles.some((role) => role.toLowerCase() === trimmed.toLowerCase())) {
        return "This role already exists.";
      }

      const nextRoles = [...roles, trimmed];
      setRoles(nextRoles);
      persistRoles(nextRoles);

      setMatrix((current) => {
        const nextMatrix: RolePermissionMatrix = {
          ...current,
          [trimmed]: buildRolePermissionDefaults(trimmed),
        };
        persistMatrix(nextMatrix);
        return nextMatrix;
      });

      return null;
    },
    [persistMatrix, roles]
  );

  const editRole = useCallback(
    (currentName: string, nextName: string): string | null => {
      const trimmed = nextName.trim();
      if (!trimmed) return "Role name cannot be empty.";
      if (isProtectedRole(currentName)) return "Protected roles cannot be renamed.";
      if (!roles.includes(currentName)) return "Selected role was not found.";
      if (
        roles.some(
          (role) => role !== currentName && role.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return "Another role already uses this name.";
      }

      const nextRoles = roles.map((role) => (role === currentName ? trimmed : role));
      setRoles(nextRoles);
      persistRoles(nextRoles);

      setMatrix((current) => {
        const { [currentName]: rolePermissions, ...rest } = current;
        const nextMatrix: RolePermissionMatrix = {
          ...rest,
          [trimmed]: rolePermissions ?? buildRolePermissionDefaults(trimmed),
        };
        persistMatrix(nextMatrix);
        return nextMatrix;
      });

      renameRoleInManagedUsers(currentName, trimmed);
      if (selectedRole === currentName) {
        setSelectedRole(trimmed);
      }

      return null;
    },
    [persistMatrix, roles, selectedRole, setSelectedRole]
  );

  const removeRole = useCallback(
    (name: string): string | null => {
      if (isProtectedRole(name)) return "Protected roles cannot be removed.";
      if (!roles.includes(name)) return "Selected role was not found.";
      if (roles.length <= 1) return "At least one role must remain.";

      const nextRoles = roles.filter((role) => role !== name);
      setRoles(nextRoles);
      persistRoles(nextRoles);

      setMatrix((current) => {
        const nextMatrix = { ...current };
        delete nextMatrix[name];
        persistMatrix(nextMatrix);
        return nextMatrix;
      });

      reassignManagedUsersFromRole(name, DEFAULT_ACTIVE_ROLE);
      if (selectedRole === name) {
        setSelectedRole(DEFAULT_ACTIVE_ROLE);
      }

      return null;
    },
    [persistMatrix, roles, selectedRole, setSelectedRole]
  );

  const canViewModule = useCallback(
    (role: UserRoleName, moduleId: PermissionModuleId) => {
      if (!isHydrated) return true;
      if (isProtectedRole(role)) return true;
      return matrix[role]?.[moduleId]?.view ?? false;
    },
    [isHydrated, matrix]
  );

  const canViewMasterPanelModule = useCallback(
    (role: UserRoleName, moduleId: MasterPanelModuleId) => {
      const permissionModuleId = getPermissionModuleForMasterPanel(moduleId);
      return canViewModule(role, permissionModuleId);
    },
    [canViewModule]
  );

  const value = useMemo<UserPermissionsContextValue>(
    () => ({
      matrix,
      roles,
      selectedRole,
      setSelectedRole,
      setPermission,
      addRole,
      editRole,
      removeRole,
      canViewModule,
      canViewMasterPanelModule,
    }),
    [
      matrix,
      roles,
      selectedRole,
      setSelectedRole,
      setPermission,
      addRole,
      editRole,
      removeRole,
      canViewModule,
      canViewMasterPanelModule,
    ]
  );

  return (
    <UserPermissionsContext.Provider value={value}>{children}</UserPermissionsContext.Provider>
  );
}

export function useUserPermissions() {
  const context = useContext(UserPermissionsContext);
  if (!context) {
    throw new Error("useUserPermissions must be used within UserPermissionsProvider");
  }
  return context;
}
