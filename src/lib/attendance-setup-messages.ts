import { extractSupabaseProjectRef } from "@/lib/database-url";

/** Short user-facing title when attendance SQL tables are not ready. */
export const ATTENDANCE_SETUP_TITLE =
  "Attendance database setup required (one-time)";

/** Short user-facing body — no npm/env jargon in layer panels. */
export const ATTENDANCE_SETUP_MESSAGE =
  "Supabase में attendance tables अभी नहीं बनी हैं। SQL Editor में migration run करें, फिर Retry दबाएँ।";

/** Developer hint — shown only in the top setup banner, not in every layer. */
export const ATTENDANCE_SETUP_DEV_HINT =
  "Vercel / .env.local में SUPABASE_DB_PASSWORD set करें तो tables automatically बन सकती हैं।";

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
    lower.includes("attendance database setup")
  );
}
