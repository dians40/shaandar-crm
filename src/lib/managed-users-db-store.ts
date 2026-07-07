import { randomUUID } from "crypto";
import { prisma, isPrismaConfigured } from "@/lib/prisma";
import {
  LAYER_2_USER_ROLE,
  LAYER_3_USER_ROLE,
  LAYER_4_USER_ROLE,
  resolveUserPipelineStage,
  type ManagedUserRecord,
} from "@/types/managed-user";
import { USER_PIPELINE_STAGES, type UserPipelineStage } from "@/types/user-pipeline";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(id: string): string {
  return UUID_PATTERN.test(id) ? id : randomUUID();
}

export function normalizeManagedUserRecord(
  user: ManagedUserRecord,
  pipelineStage?: UserPipelineStage
): ManagedUserRecord {
  const stage = pipelineStage ?? resolveUserPipelineStage(user);
  let role = user.role;
  if (stage === USER_PIPELINE_STAGES.LAYER_2_STAGING) role = LAYER_2_USER_ROLE;
  if (stage === USER_PIPELINE_STAGES.LAYER_3_WORKFLOW) role = LAYER_3_USER_ROLE;
  if (stage === USER_PIPELINE_STAGES.LAYER_4_SAVED) role = LAYER_4_USER_ROLE;

  return {
    ...user,
    id: normalizeUuid(user.id),
    fullName: user.fullName.trim(),
    username: user.username.trim(),
    password: user.password,
    role,
    otpEnabled: Boolean(user.otpEnabled),
    pipelineStage: stage,
    createdAt: user.createdAt || new Date().toISOString(),
  };
}

function mapRow(row: {
  id: string;
  fullName: string;
  username: string;
  password: string;
  role: string;
  otpEnabled: boolean;
  pipelineStage: string;
  createdAt: Date;
}): ManagedUserRecord {
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    password: row.password,
    role: row.role as ManagedUserRecord["role"],
    otpEnabled: row.otpEnabled,
    pipelineStage: row.pipelineStage as UserPipelineStage,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function isManagedUsersDbAvailable(): Promise<boolean> {
  if (!isPrismaConfigured() || !prisma) return false;
  try {
    await prisma.crmManagedUser.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    console.warn("[managed-users-db] table unavailable:", error);
    return false;
  }
}

export async function readManagedUsersFromDb(): Promise<ManagedUserRecord[]> {
  if (!isPrismaConfigured() || !prisma) return [];
  const rows = await prisma.crmManagedUser.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

export async function upsertManagedUserInDb(
  user: ManagedUserRecord
): Promise<ManagedUserRecord> {
  if (!isPrismaConfigured() || !prisma) {
    throw new Error("Database is not configured.");
  }

  const normalized = normalizeManagedUserRecord(user);
  const createdAt = new Date(normalized.createdAt);

  const row = await prisma.crmManagedUser.upsert({
    where: { username: normalized.username },
    create: {
      id: normalized.id,
      fullName: normalized.fullName,
      username: normalized.username,
      password: normalized.password,
      role: normalized.role,
      otpEnabled: normalized.otpEnabled,
      pipelineStage: normalized.pipelineStage ?? USER_PIPELINE_STAGES.LAYER_2_STAGING,
      createdAt,
    },
    update: {
      fullName: normalized.fullName,
      password: normalized.password,
      role: normalized.role,
      otpEnabled: normalized.otpEnabled,
      pipelineStage: normalized.pipelineStage ?? USER_PIPELINE_STAGES.LAYER_2_STAGING,
    },
  });

  return mapRow(row);
}

export async function deleteManagedUserFromDb(userId: string): Promise<void> {
  if (!isPrismaConfigured() || !prisma) {
    throw new Error("Database is not configured.");
  }
  await prisma.crmManagedUser.delete({ where: { id: userId } });
}

export async function replaceAllManagedUsersInDb(users: ManagedUserRecord[]): Promise<void> {
  if (!isPrismaConfigured() || !prisma) {
    throw new Error("Database is not configured.");
  }

  const normalized = users.map((user) => normalizeManagedUserRecord(user));

  await prisma.$transaction([
    prisma.crmManagedUser.deleteMany(),
    prisma.crmManagedUser.createMany({
      data: normalized.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        password: user.password,
        role: user.role,
        otpEnabled: user.otpEnabled,
        pipelineStage: user.pipelineStage ?? USER_PIPELINE_STAGES.LAYER_2_STAGING,
        createdAt: new Date(user.createdAt),
      })),
      skipDuplicates: true,
    }),
  ]);
}
