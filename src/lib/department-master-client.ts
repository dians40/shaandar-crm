import type { GeneralSettingsRecord } from "@/types/general-settings";

export const DEPARTMENT_MASTER_REFRESH_EVENT = "shaandar-crm-department-master-refresh";

export async function fetchDepartmentsFromServer(): Promise<GeneralSettingsRecord[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/v1/departments", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { departments?: GeneralSettingsRecord[] };
    return Array.isArray(payload.departments) ? payload.departments : null;
  } catch {
    return null;
  }
}

export async function upsertDepartmentOnServer(
  name: string
): Promise<{ ok: boolean; departments: GeneralSettingsRecord[] }> {
  if (typeof window === "undefined") {
    return { ok: false, departments: [] };
  }
  try {
    const response = await fetch("/api/v1/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      return { ok: false, departments: [] };
    }
    const payload = (await response.json()) as { departments?: GeneralSettingsRecord[] };
    const departments = Array.isArray(payload.departments) ? payload.departments : [];
    dispatchDepartmentMasterRefresh();
    return { ok: true, departments };
  } catch {
    return { ok: false, departments: [] };
  }
}

export async function deleteDepartmentOnServer(
  id: string
): Promise<{ ok: boolean; departments: GeneralSettingsRecord[] }> {
  if (typeof window === "undefined") {
    return { ok: false, departments: [] };
  }
  try {
    const response = await fetch(`/api/v1/departments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      return { ok: false, departments: [] };
    }
    const payload = (await response.json()) as { departments?: GeneralSettingsRecord[] };
    const departments = Array.isArray(payload.departments) ? payload.departments : [];
    dispatchDepartmentMasterRefresh();
    return { ok: true, departments };
  } catch {
    return { ok: false, departments: [] };
  }
}

export function dispatchDepartmentMasterRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEPARTMENT_MASTER_REFRESH_EVENT));
}
