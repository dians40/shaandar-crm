import { promises as fs } from "fs";
import path from "path";
import { isSanjeevLayer2Username } from "@/lib/auth";
import {
  deleteManagedUserFromDb,
  isManagedUsersDbAvailable,
  normalizeManagedUserRecord,
  readManagedUsersFromDb,
  replaceAllManagedUsersInDb,
  upsertManagedUserInDb,
} from "@/lib/managed-users-db-store";
import type { ManagedUserRecord } from "@/types/managed-user";
import { resolveWorkspaceDataDir } from "@/lib/cloud-workspace-paths";

const DATA_DIR = resolveWorkspaceDataDir();
const DATA_FILE = path.join(DATA_DIR, "managed-users.json");

async function readJsonFallback(): Promise<ManagedUserRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ManagedUserRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonFallback(users: ManagedUserRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
}

async function migrateJsonToDbIfNeeded(): Promise<ManagedUserRecord[]> {
  const jsonUsers = await readJsonFallback();
  if (jsonUsers.length === 0) return [];
  await replaceAllManagedUsersInDb(jsonUsers);
  return readManagedUsersFromDb();
}

export async function readManagedUsersServer(): Promise<ManagedUserRecord[]> {
  if (await isManagedUsersDbAvailable()) {
    const dbUsers = await readManagedUsersFromDb();
    if (dbUsers.length > 0) return dbUsers;
    return migrateJsonToDbIfNeeded();
  }
  return readJsonFallback();
}

export async function upsertManagedUserServer(
  user: ManagedUserRecord
): Promise<ManagedUserRecord> {
  const normalized = normalizeManagedUserRecord(user);

  if (await isManagedUsersDbAvailable()) {
    return upsertManagedUserInDb(normalized);
  }

  const users = await readJsonFallback();
  const next = [
    normalized,
    ...users.filter(
      (row) => row.id !== normalized.id && row.username.trim() !== normalized.username.trim()
    ),
  ];
  await writeJsonFallback(next);
  return normalized;
}

export async function deleteManagedUserServer(userId: string): Promise<void> {
  if (await isManagedUsersDbAvailable()) {
    await deleteManagedUserFromDb(userId);
    return;
  }

  const users = await readJsonFallback();
  await writeJsonFallback(users.filter((row) => row.id !== userId));
}

export async function writeManagedUsersServer(users: ManagedUserRecord[]): Promise<void> {
  const normalized = users.map((user) => normalizeManagedUserRecord(user));

  if (await isManagedUsersDbAvailable()) {
    await replaceAllManagedUsersInDb(normalized);
    return;
  }

  await writeJsonFallback(normalized);
}

export async function findManagedUserByUsernameServer(
  username: string
): Promise<ManagedUserRecord | undefined> {
  const normalized = username.trim().toLowerCase();
  return (await readManagedUsersServer()).find((row) => {
    const rowNormalized = row.username.trim().toLowerCase();
    if (rowNormalized === normalized) {
      return true;
    }
    if (isSanjeevLayer2Username(username) && rowNormalized === "sanjeev") {
      return true;
    }
    return false;
  });
}
