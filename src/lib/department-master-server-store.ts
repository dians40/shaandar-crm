import { promises as fs } from "fs";
import path from "path";
import {
  deleteDepartmentFromDb,
  isDepartmentMasterDbAvailable,
  readDepartmentsFromDb,
  syncDepartmentsInDb,
  upsertDepartmentInDb,
} from "@/lib/department-master-db-store";
import "@/lib/baseline-locks";
import { resolveWorkspaceDataDir } from "@/lib/cloud-workspace-paths";
import type { GeneralSettingsRecord } from "@/types/general-settings";
import { DEFAULT_DEPARTMENT_SEEDS } from "@/types/general-settings";

const DATA_DIR = resolveWorkspaceDataDir();
const DATA_FILE = path.join(DATA_DIR, "departments.json");

async function readJsonFallback(): Promise<GeneralSettingsRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as GeneralSettingsRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonFallback(departments: GeneralSettingsRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(departments, null, 2), "utf-8");
}

async function ensureDefaultDepartmentSeeds(): Promise<void> {
  for (const name of DEFAULT_DEPARTMENT_SEEDS) {
    await upsertDepartmentServer(name);
  }
}

export async function readDepartmentsServer(): Promise<GeneralSettingsRecord[]> {
  await ensureDefaultDepartmentSeeds();
  if (await isDepartmentMasterDbAvailable()) {
    return readDepartmentsFromDb();
  }
  return readJsonFallback();
}

export async function upsertDepartmentServer(name: string): Promise<GeneralSettingsRecord | null> {
  if (await isDepartmentMasterDbAvailable()) {
    return upsertDepartmentInDb(name);
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
    id: `department-${Date.now()}`,
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

export async function deleteDepartmentServer(id: string): Promise<void> {
  if (await isDepartmentMasterDbAvailable()) {
    await deleteDepartmentFromDb(id);
    return;
  }

  const existing = await readJsonFallback();
  await writeJsonFallback(existing.filter((row) => row.id !== id));
}

export async function syncDepartmentsFromAttendanceServer(names: string[]): Promise<number> {
  const tokens = names
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (tokens.length === 0) return 0;

  if (await isDepartmentMasterDbAvailable()) {
    return syncDepartmentsInDb(tokens);
  }

  let inserted = 0;
  for (const token of tokens) {
    const before = await readJsonFallback();
    const exists = before.some(
      (row) => row.name.trim().toLowerCase() === token.toLowerCase()
    );
    if (!exists) {
      await upsertDepartmentServer(token);
      inserted += 1;
    }
  }
  return inserted;
}
