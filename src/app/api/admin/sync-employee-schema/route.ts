import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/api/auth-guard";
import {
  checkEmployeeFirmColumnsReady,
  ensureEmployeeFirmColumnsSchema,
} from "@/lib/employee-schema-ensure";

/**
 * Employee firm-column schema sync for migration 016.
 * Requires DATABASE_URL or SUPABASE_DB_URL in server environment.
 * POST /api/admin/sync-employee-schema
 */
export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const check = await checkEmployeeFirmColumnsReady();
  return NextResponse.json(check);
}

export async function POST() {
  const authError = await requireAuth();
  if (authError) return authError;

  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "016_employee_firm_head_pf_firm.sql"
  );

  if (!fs.existsSync(migrationPath)) {
    return NextResponse.json({ error: "Migration 016 file not found." }, { status: 500 });
  }

  const result = await ensureEmployeeFirmColumnsSchema();

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        hint: "Run supabase/migrations/016_employee_firm_head_pf_firm.sql in Supabase SQL Editor.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
  });
}
