import { NextResponse } from "next/server";
import {
  readManagedUsersServer,
  writeManagedUsersServer,
} from "@/lib/managed-users-server-store";
import { requireFullAccessUser } from "@/lib/api/auth-guard";
import type { ManagedUserRecord } from "@/types/managed-user";

export async function GET() {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

  const users = await readManagedUsersServer();
  return NextResponse.json({ users });
}

export async function PUT(request: Request) {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const users = (body as { users?: ManagedUserRecord[] }).users;
  if (!Array.isArray(users)) {
    return NextResponse.json({ error: "Expected { users: ManagedUserRecord[] }." }, { status: 400 });
  }

  await writeManagedUsersServer(users);
  return NextResponse.json({ ok: true, count: users.length });
}
