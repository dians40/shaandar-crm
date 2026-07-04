import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/api/auth-guard";

/**
 * One-time schema sync for migration 006.
 * Requires DATABASE_URL or SUPABASE_DB_URL in server environment.
 * POST /api/admin/sync-employee-schema
 */
export async function POST() {
  const authError = await requireAuth();
  if (authError) return authError;

  const databaseUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (!databaseUrl) {
    return NextResponse.json(
      {
        error:
          "DATABASE_URL not configured on server. Run supabase/migrations/006_employee_unified_assignment_status.sql in Supabase SQL Editor instead.",
      },
      { status: 503 }
    );
  }

  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "006_employee_unified_assignment_status.sql"
  );

  if (!fs.existsSync(migrationPath)) {
    return NextResponse.json({ error: "Migration file not found." }, { status: 500 });
  }

  const sql = fs.readFileSync(migrationPath, "utf8");

  try {
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(sql);
    await client.end();

    return NextResponse.json({
      ok: true,
      message:
        "Migration 006 applied. assigned_from_group, esi_status, pf_status synced and PostgREST cache reloaded.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
