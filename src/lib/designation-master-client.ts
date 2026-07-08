import type { GeneralSettingsRecord } from "@/types/general-settings";

export const DESIGNATION_MASTER_REFRESH_EVENT = "shaandar-crm-designation-master-refresh";

export async function fetchDesignationsFromServer(): Promise<GeneralSettingsRecord[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/v1/designations", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { designations?: GeneralSettingsRecord[] };
    return Array.isArray(payload.designations) ? payload.designations : null;
  } catch {
    return null;
  }
}

export async function upsertDesignationOnServer(
  name: string
): Promise<{ ok: boolean; designations: GeneralSettingsRecord[] }> {
  if (typeof window === "undefined") {
    return { ok: false, designations: [] };
  }
  try {
    const response = await fetch("/api/v1/designations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      return { ok: false, designations: [] };
    }
    const payload = (await response.json()) as { designations?: GeneralSettingsRecord[] };
    const designations = Array.isArray(payload.designations) ? payload.designations : [];
    dispatchDesignationMasterRefresh();
    return { ok: true, designations };
  } catch {
    return { ok: false, designations: [] };
  }
}

export async function deleteDesignationOnServer(
  id: string
): Promise<{ ok: boolean; designations: GeneralSettingsRecord[] }> {
  if (typeof window === "undefined") {
    return { ok: false, designations: [] };
  }
  try {
    const response = await fetch(`/api/v1/designations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      return { ok: false, designations: [] };
    }
    const payload = (await response.json()) as { designations?: GeneralSettingsRecord[] };
    const designations = Array.isArray(payload.designations) ? payload.designations : [];
    dispatchDesignationMasterRefresh();
    return { ok: true, designations };
  } catch {
    return { ok: false, designations: [] };
  }
}

export function dispatchDesignationMasterRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DESIGNATION_MASTER_REFRESH_EVENT));
}
