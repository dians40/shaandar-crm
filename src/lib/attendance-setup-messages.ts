import { extractSupabaseProjectRef } from "@/lib/database-url";

/** Short user-facing title when attendance SQL tables are not ready. */
export const ATTENDANCE_SETUP_TITLE =
  "Attendance database setup required (one-time)";

/** Short user-facing body — shown only in the top setup banner. */
export const ATTENDANCE_SETUP_MESSAGE =
  "Attendance SQL tables are not created yet. Run the migration in Supabase SQL Editor, then click Retry setup.";

/** Developer hint — shown only in the top setup banner, not in every layer. */
export const ATTENDANCE_SETUP_DEV_HINT =
  "Set SUPABASE_DB_PASSWORD in Vercel environment variables to auto-create tables on save.";

export function getSupabaseSqlEditorUrl(): string {
  const projectRef = extractSupabaseProjectRef();
  if (projectRef) {
    return `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
  }
  return "https://supabase.com/dashboard";
}

/** Detect setup/migration errors so layers can suppress duplicate banners. */
export function isAttendanceSetupError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("setuprequired") ||
    lower.includes("sql table") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("could not find table") ||
    lower.includes("attendance_staging") ||
    lower.includes("attendance staging") ||
    lower.includes("run migration") ||
    lower.includes("supabase_db_password") ||
    lower.includes("database_url") ||
    lower.includes("npm run setup") ||
    lower.includes("npm run migrate") ||
    lower.includes("attendance database setup") ||
    lower.includes("sql tables are not created")
  );
}
