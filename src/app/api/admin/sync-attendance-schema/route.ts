import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { ensureAttendanceTablesSchema } from "@/lib/attendance-schema-ensure";

/**
 * One-time schema sync for migration 011 (attendance tables).
 * Requires DATABASE_URL or SUPABASE_DB_URL in server environment.
 * POST /api/admin/sync-attendance-schema
 */
export async function POST() {
  const authError = await requireAuth();
  if (authError) return authError;

  const result = await ensureAttendanceTablesSchema();
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
  });
}
