import { NextResponse } from "next/server";
import {
  deleteDesignationServer,
  readDesignationsServer,
  upsertDesignationServer,
} from "@/lib/designation-master-server-store";
import { requireAuth, requireFullAccessUser } from "@/lib/api/auth-guard";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const designations = await readDesignationsServer();
  return NextResponse.json({ designations });
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

  const name = String((body as { name?: string }).name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Designation name is required." }, { status: 400 });
  }

  try {
    await upsertDesignationServer(name);
    const designations = await readDesignationsServer();
    return NextResponse.json({ ok: true, designations });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save designation to database.",
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
    await deleteDesignationServer(id);
    const designations = await readDesignationsServer();
    return NextResponse.json({ ok: true, designations });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete designation from database.",
      },
      { status: 500 }
    );
  }
}
