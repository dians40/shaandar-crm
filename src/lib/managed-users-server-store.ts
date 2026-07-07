import { promises as fs } from "fs";
import path from "path";
import { isSanjeevLayer2Username } from "@/lib/auth";
import type { ManagedUserRecord } from "@/types/managed-user";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "managed-users.json");

export async function readManagedUsersServer(): Promise<ManagedUserRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ManagedUserRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeManagedUsersServer(users: ManagedUserRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
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
