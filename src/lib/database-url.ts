import { readSupabaseUrl } from "@/lib/supabase/env";

/** Direct Postgres connection string from env (Prisma / Vercel / pooler). */
export function resolveDirectDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

/** Extract Supabase project ref from https://REF.supabase.co URL. */
export function extractSupabaseProjectRef(): string | null {
  const url = readSupabaseUrl();
  if (!url) return null;

  const match = url.match(/https:\/\/([a-z0-9-]+)\.supabase\.(?:co|in)/i);
  return match?.[1] ?? null;
}

/**
 * Build postgres:// URL from NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD.
 * Mirrors scripts/apply-attendance-schema-migration.mjs.
 */
export function deriveSupabasePostgresUrl(): string | null {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const projectRef = extractSupabaseProjectRef();
  if (!password || !projectRef) return null;

  const host =
    process.env.SUPABASE_DB_HOST?.trim() || `db.${projectRef}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT?.trim() || "5432";
  const database = process.env.SUPABASE_DB_NAME?.trim() || "postgres";
  const user = process.env.SUPABASE_DB_USER?.trim() || "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

/** Best available Postgres connection string for DDL migrations. */
export function resolveDatabaseUrl(): string | null {
  return resolveDirectDatabaseUrl() || deriveSupabasePostgresUrl();
}

/** Actionable hint when auto DDL cannot run (no postgres credentials). */
export function getDatabaseUrlResolutionHint(): string {
  return "Add pipeline_stage column: paste migration 013 in Supabase SQL Editor (/api/v1/attendance/schema/migration-sql?file=013), or set SUPABASE_DB_PASSWORD / DATABASE_URL in Vercel env for auto-migration.";
}
