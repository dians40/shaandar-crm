/**
 * Applies migration 011 to the linked Supabase Postgres database.
 *
 * Requires ONE of:
 *   DATABASE_URL=postgresql://...
 *   SUPABASE_DB_URL=postgresql://...
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD (direct connection)
 *
 * Run: npm run migrate:attendance
 */
import fs from "fs";
import path from "path";
import { loadProjectEnv, resolveSupabaseEnv } from "./load-env.mjs";

const MIGRATION_FILES = [
  path.join(process.cwd(), "supabase", "migrations", "011_ensure_attendance_tables.sql"),
  path.join(process.cwd(), "supabase", "migrations", "012_attendance_staging_workflow.sql"),
];

function buildDatabaseUrl(env) {
  const direct =
    env.DATABASE_URL?.trim() ||
    env.SUPABASE_DB_URL?.trim() ||
    env.POSTGRES_URL?.trim();
  if (direct) return direct;

  const password = env.SUPABASE_DB_PASSWORD?.trim();
  const { url } = resolveSupabaseEnv(env);
  if (!password || !url) return null;

  const match = url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (!match) return null;

  const projectRef = match[1];
  const host = env.SUPABASE_DB_HOST?.trim() || `db.${projectRef}.supabase.co`;
  const port = env.SUPABASE_DB_PORT?.trim() || "5432";
  const database = env.SUPABASE_DB_NAME?.trim() || "postgres";
  const user = env.SUPABASE_DB_USER?.trim() || "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function main() {
  const quiet =
    process.argv.includes("--quiet") ||
    process.argv.includes("--skip-if-no-credentials");

  if (!quiet) {
    console.log("\n=== Shaandar CRM — Attendance Schema Migrations 011 + 012 ===\n");
  }

  for (const migrationPath of MIGRATION_FILES) {
    if (!fs.existsSync(migrationPath)) {
      console.error("FAIL: Migration file not found:", migrationPath);
      process.exit(1);
    }
  }

  const sql = MIGRATION_FILES.map((file) => fs.readFileSync(file, "utf8")).join("\n\n");
  const env = loadProjectEnv();
  const databaseUrl = buildDatabaseUrl(env);

  if (!databaseUrl) {
    if (quiet) {
      process.exit(0);
    }
    console.error("FAIL: No database connection configured.");
    console.error("");
    console.error("Add ONE of these to .env.local:");
    console.error("  DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres");
    console.error("  SUPABASE_DB_PASSWORD=your-db-password  (with NEXT_PUBLIC_SUPABASE_URL set)");
    console.error("");
    console.error("Or paste migration files in Supabase Dashboard → SQL Editor → Run:");
    for (const file of MIGRATION_FILES) console.error(`  ${file}`);
    console.error("");
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Installing pg driver...");
    const { execSync } = await import("child_process");
    execSync("npm install pg --no-save", { stdio: "inherit" });
    pg = await import("pg");
  }

  const client = new pg.default.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Postgres. Applying migrations 011 + 012...");
    await client.query(sql);
    console.log("SUCCESS: Attendance + staging tables synced and PostgREST cache reloaded.");
    console.log("");
    console.log("Tables ready:");
    console.log("  - public.employee_attendance");
    console.log("  - public.biometric_attendance");
    console.log("  - public.attendance_staging");
    console.log("  - public.attendance_audit_log");
    console.log("");
    process.exit(0);
  } catch (err) {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    console.error("");
    console.error("Manual fallback: Supabase Dashboard → SQL Editor");
    console.error(`Paste: ${MIGRATION_FILES.join(", ")}`);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
