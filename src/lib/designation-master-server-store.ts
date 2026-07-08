import { promises as fs } from "fs";
import path from "path";
import {
  deleteDesignationFromDb,
  isDesignationMasterDbAvailable,
  readDesignationsFromDb,
  upsertDesignationInDb,
} from "@/lib/designation-master-db-store";
import type { GeneralSettingsRecord } from "@/types/general-settings";
import { DEFAULT_DESIGNATION_SEEDS } from "@/types/general-settings";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "designations.json");

async function readJsonFallback(): Promise<GeneralSettingsRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as GeneralSettingsRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonFallback(designations: GeneralSettingsRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(designations, null, 2), "utf-8");
}

async function ensureDefaultDesignationSeeds(): Promise<void> {
  for (const name of DEFAULT_DESIGNATION_SEEDS) {
    await upsertDesignationServer(name);
  }
}

export async function readDesignationsServer(): Promise<GeneralSettingsRecord[]> {
  await ensureDefaultDesignationSeeds();
  if (await isDesignationMasterDbAvailable()) {
    return readDesignationsFromDb();
  }
  return readJsonFallback();
}

export async function upsertDesignationServer(name: string): Promise<GeneralSettingsRecord | null> {
  if (await isDesignationMasterDbAvailable()) {
    return upsertDesignationInDb(name);
  }

  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) return null;

  const existing = await readJsonFallback();
  const found = existing.find(
    (row) => row.name.trim().toLowerCase() === normalized.toLowerCase()
  );
  if (found) return found;

  const now = new Date().toISOString();
  const record: GeneralSettingsRecord = {
    id: `designation-${Date.now()}`,
    name: normalized,
    createdAt: now,
    updatedAt: now,
  };
  const next = [...existing, record].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  await writeJsonFallback(next);
  return record;
}

export async function deleteDesignationServer(id: string): Promise<void> {
  if (await isDesignationMasterDbAvailable()) {
    await deleteDesignationFromDb(id);
    return;
  }

  const existing = await readJsonFallback();
  await writeJsonFallback(existing.filter((row) => row.id !== id));
}
