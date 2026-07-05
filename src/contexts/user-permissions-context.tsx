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
  createDefaultPermissionMatrix,
  DEFAULT_ACTIVE_ROLE,
} from "@/constants/user-permissions-defaults";
import {
  ACTIVE_ROLE_STORAGE_KEY,
  PERMISSIONS_STORAGE_KEY,
  type PermissionKey,
  type PermissionModuleId,
  type RolePermissionMatrix,
  type UserRoleName,
  USER_ROLES,
} from "@/types/user-permissions";

type UserPermissionsContextValue = {
  matrix: RolePermissionMatrix;
  selectedRole: UserRoleName;
  setSelectedRole: (role: UserRoleName) => void;
  setPermission: (
    role: UserRoleName,
    moduleId: PermissionModuleId,
    permission: PermissionKey,
    enabled: boolean
  ) => void;
  canViewModule: (role: UserRoleName, moduleId: PermissionModuleId) => boolean;
  canViewMasterPanelModule: (role: UserRoleName, moduleId: MasterPanelModuleId) => boolean;
};

const UserPermissionsContext = createContext<UserPermissionsContextValue | null>(null);

function readStoredMatrix(): RolePermissionMatrix {
  if (typeof window === "undefined") return createDefaultPermissionMatrix();

  try {
    const raw = window.localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return createDefaultPermissionMatrix();
    const parsed = JSON.parse(raw) as RolePermissionMatrix;
    return { ...createDefaultPermissionMatrix(), ...parsed };
  } catch {
    return createDefaultPermissionMatrix();
  }
}

function readStoredRole(): UserRoleName {
  if (typeof window === "undefined") return DEFAULT_ACTIVE_ROLE;

  try {
    const raw = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    if (raw && USER_ROLES.includes(raw as UserRoleName)) {
      return raw as UserRoleName;
    }
  } catch {
    // fall through
  }

  return DEFAULT_ACTIVE_ROLE;
}

export function UserPermissionsProvider({ children }: { children: ReactNode }) {
  const [matrix, setMatrix] = useState<RolePermissionMatrix>(() =>
    createDefaultPermissionMatrix()
  );
  const [selectedRole, setSelectedRoleState] = useState<UserRoleName>(DEFAULT_ACTIVE_ROLE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setMatrix(readStoredMatrix());
    setSelectedRoleState(readStoredRole());
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
      if (role === "Super Admin") return;

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

  const canViewModule = useCallback(
    (role: UserRoleName, moduleId: PermissionModuleId) => {
      if (!isHydrated) return true;
      if (role === "Super Admin") return true;
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
      selectedRole,
      setSelectedRole,
      setPermission,
      canViewModule,
      canViewMasterPanelModule,
    }),
    [matrix, selectedRole, setSelectedRole, setPermission, canViewModule, canViewMasterPanelModule]
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
