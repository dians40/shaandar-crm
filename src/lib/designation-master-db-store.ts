import { randomUUID } from "crypto";
import { prisma, isPrismaConfigured } from "@/lib/prisma";
import {
  normalizeGeneralSettingsRecord,
  type GeneralSettingsRecord,
} from "@/types/general-settings";

function normalizeDesignationName(name: string): string {
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

export async function isDesignationMasterDbAvailable(): Promise<boolean> {
  if (!isPrismaConfigured() || !prisma) return false;
  try {
    await prisma.crmDesignation.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    console.warn("[designation-master-db] table unavailable:", error);
    return false;
  }
}

export async function readDesignationsFromDb(): Promise<GeneralSettingsRecord[]> {
  if (!isPrismaConfigured() || !prisma) return [];
  const rows = await prisma.crmDesignation.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map(mapRow);
}

export async function upsertDesignationInDb(name: string): Promise<GeneralSettingsRecord | null> {
  if (!isPrismaConfigured() || !prisma) {
    throw new Error("Database is not configured.");
  }

  const normalized = normalizeDesignationName(name);
  if (!normalized) return null;

  const existing = await prisma.crmDesignation.findFirst({
    where: { name: { equals: normalized, mode: "insensitive" } },
  });
  if (existing) {
    const row = await prisma.crmDesignation.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
    return mapRow(row);
  }

  const now = new Date();
  const row = await prisma.crmDesignation.create({
    data: {
      id: randomUUID(),
      name: normalized,
      createdAt: now,
      updatedAt: now,
    },
  });

  return mapRow(row);
}

export async function deleteDesignationFromDb(id: string): Promise<void> {
  if (!isPrismaConfigured() || !prisma) {
    throw new Error("Database is not configured.");
  }
  await prisma.crmDesignation.delete({ where: { id } });
}
