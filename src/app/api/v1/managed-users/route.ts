import { NextResponse } from "next/server";
import {
  deleteManagedUserServer,
  readManagedUsersServer,
  upsertManagedUserServer,
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

export async function POST(request: Request) {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const user = (body as { user?: ManagedUserRecord }).user;
  if (!user?.username || !user?.password || !user?.fullName) {
    return NextResponse.json(
      { error: "Expected { user: ManagedUserRecord } with fullName, username, and password." },
      { status: 400 }
    );
  }

  try {
    const saved = await upsertManagedUserServer(user);
    const users = await readManagedUsersServer();
    return NextResponse.json({ ok: true, user: saved, users });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to persist user to database.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authError = await requireFullAccessUser();
  if (authError) return authError;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Query parameter id is required." }, { status: 400 });
  }

  try {
    await deleteManagedUserServer(id);
    const users = await readManagedUsersServer();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete user from database.",
      },
      { status: 500 }
    );
  }
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

  try {
    await writeManagedUsersServer(users);
    const refreshed = await readManagedUsersServer();
    return NextResponse.json({ ok: true, count: refreshed.length, users: refreshed });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync managed users to database.",
      },
      { status: 500 }
    );
  }
}
