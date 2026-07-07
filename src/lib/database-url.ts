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
  if (resolveDirectDatabaseUrl()) {
    return "DATABASE_URL is set but schema ensure failed — verify the connection string and retry save.";
  }

  if (process.env.SUPABASE_DB_PASSWORD?.trim()) {
    return "SUPABASE_DB_PASSWORD is set but connection failed — verify the database password in Supabase Dashboard → Project Settings → Database, then retry save.";
  }

  const hasManagementToken =
    Boolean(process.env.SUPABASE_ACCESS_TOKEN?.trim()) ||
    Boolean(process.env.SUPABASE_MANAGEMENT_TOKEN?.trim());

  if (hasManagementToken && readSupabaseUrl()) {
    return "SUPABASE_ACCESS_TOKEN is set — retry save to auto-create tables via Management API. If it still fails, run: npm run migrate:attendance";
  }

  if (readSupabaseUrl()) {
    return "Run npm run setup:supabase (includes database password) or add SUPABASE_DB_PASSWORD to .env.local, then restart dev server — attendance tables will be created automatically on next save.";
  }

  return "Add DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD to .env.local, then run npm run migrate:attendance or npm run setup:supabase.";
}
