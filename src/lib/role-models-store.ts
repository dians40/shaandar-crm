import type { RoleModelRecord } from "@/types/role-model";

export const ROLE_MODELS_STORAGE_KEY = "shaandar-crm-role-models";

function readRows(): RoleModelRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ROLE_MODELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RoleModelRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRows(rows: RoleModelRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_MODELS_STORAGE_KEY, JSON.stringify(rows));
}

export function readRoleModels(): RoleModelRecord[] {
  return readRows();
}

export function appendRoleModel(record: RoleModelRecord): RoleModelRecord[] {
  const next = [record, ...readRows()];
  writeRows(next);
  return next;
}

export function renameRoleInRoleModels(oldRole: string, newRole: string): RoleModelRecord[] {
  const next = readRows().map((row) =>
    row.role === oldRole ? { ...row, role: newRole } : row
  );
  writeRows(next);
  return next;
}

export function removeRoleFromRoleModels(role: string): RoleModelRecord[] {
  const next = readRows().filter((row) => row.role !== role);
  writeRows(next);
  return next;
}
