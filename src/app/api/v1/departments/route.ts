import { NextResponse } from "next/server";
import {
  deleteDepartmentServer,
  readDepartmentsServer,
  syncDepartmentsFromAttendanceServer,
  upsertDepartmentServer,
} from "@/lib/department-master-server-store";
import { requireAuth, requireFullAccessUser } from "@/lib/api/auth-guard";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const departments = await readDepartmentsServer();
  return NextResponse.json({ departments });
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

  const payload = body as { name?: string; names?: string[]; action?: string };

  if (payload.action === "sync-from-attendance" && Array.isArray(payload.names)) {
    const synced = await syncDepartmentsFromAttendanceServer(payload.names);
    const departments = await readDepartmentsServer();
    return NextResponse.json({ ok: true, synced, departments });
  }

  const name = String(payload.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Department name is required." }, { status: 400 });
  }

  try {
    await upsertDepartmentServer(name);
    const departments = await readDepartmentsServer();
    return NextResponse.json({ ok: true, departments });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save department to database.",
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
    await deleteDepartmentServer(id);
    const departments = await readDepartmentsServer();
    return NextResponse.json({ ok: true, departments });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete department from database.",
      },
      { status: 500 }
    );
  }
}
