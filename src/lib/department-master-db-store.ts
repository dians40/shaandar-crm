import { randomUUID } from "crypto";
import { prisma, isPrismaConfigured } from "@/lib/prisma";
import {
  normalizeGeneralSettingsRecord,
  type GeneralSettingsRecord,
} from "@/types/general-settings";

function normalizeDepartmentName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function mapRow(row: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): GeneralSettingsRecord {
  return normalizeGeneralSettingsRecord({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function isDepartmentMasterDbAvailable(): Promise<boolean> {
  if (!isPrismaConfigured() || !prisma) return false;
  try {
    await prisma.crmDepartment.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    console.warn("[department-master-db] table unavailable:", error);
    return false;
  }
}

export async function readDepartmentsFromDb(): Promise<GeneralSettingsRecord[]> {
  if (!isPrismaConfigured() || !prisma) return [];
  const rows = await prisma.crmDepartment.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map(mapRow);
}

export async function upsertDepartmentInDb(name: string): Promise<GeneralSettingsRecord | null> {
  if (!isPrismaConfigured() || !prisma) {
    throw new Error("Database is not configured.");
  }

  const normalized = normalizeDepartmentName(name);
  if (!normalized) return null;

  const existing = await prisma.crmDepartment.findFirst({
    where: { name: { equals: normalized, mode: "insensitive" } },
  });
  if (existing) {
    const row = await prisma.crmDepartment.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
    return mapRow(row);
  }

  const now = new Date();
  const row = await prisma.crmDepartment.create({
    data: {
      id: randomUUID(),
      name: normalized,
      createdAt: now,
      updatedAt: now,
    },
  });

  return mapRow(row);
}

export async function deleteDepartmentFromDb(id: string): Promise<void> {
  if (!isPrismaConfigured() || !prisma) {
    throw new Error("Database is not configured.");
  }
  await prisma.crmDepartment.delete({ where: { id } });
}

export async function syncDepartmentsInDb(names: string[]): Promise<number> {
  let inserted = 0;
  for (const rawName of names) {
    const result = await upsertDepartmentInDb(rawName);
    if (result) inserted += 1;
  }
  return inserted;
}

export function extractDepartmentNamesFromRows(
  rows: Array<{ department?: unknown }>
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const token = normalizeDepartmentName(String(row.department ?? ""));
    if (token) set.add(token);
  }
  return Array.from(set);
}
