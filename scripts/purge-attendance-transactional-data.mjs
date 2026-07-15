/**
 * V19 CLI — purge transactional attendance data (no UI changes).
 * Run: npm run purge:attendance
 *
 * Requires .env.local with Supabase service role credentials.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv, resolveSupabaseEnv } from "./load-env.mjs";

const CONFIRM = "PURGE_ATTENDANCE_TRANSACTIONAL_V19";
const BUCKET = "attendance-imports";
const OVERLAY_PATH = "pipeline-overlays/stages.json";

const TABLES = [
  "attendance_audit_log",
  "attendance_staging",
  "biometric_attendance",
  "employee_attendance",
];

function isMissingTable(message) {
  const lower = String(message ?? "").toLowerCase();
  return lower.includes("does not exist") || lower.includes("could not find the table");
}

async function deleteAll(supabase, table) {
  const { count, error: countError } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (countError) {
    if (isMissingTable(countError.message)) return 0;
    throw new Error(`${table}: ${countError.message}`);
  }
  if (!count) return 0;

  const { error } = await supabase
    .from(table)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    if (isMissingTable(error.message)) return 0;
    throw new Error(`${table}: ${error.message}`);
  }
  return count;
}

async function main() {
  const env = loadProjectEnv();
  const { url, serviceRoleKey } = resolveSupabaseEnv(env);

  if (!url || !serviceRoleKey) {
    console.error("FAIL: Supabase URL or service role key missing in .env.local");
    process.exit(1);
  }

  if (process.argv[2] !== CONFIRM) {
    console.log("\nV19 attendance transactional purge");
    console.log(`Run with confirm token:\n  npm run purge:attendance -- ${CONFIRM}\n`);
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tables = {};
  for (const table of TABLES) {
    tables[table] = await deleteAll(supabase, table);
    console.log(`Purged ${tables[table]} row(s) from ${table}`);
  }

  let storageRemoved = 0;
  const { data: folders } = await supabase.storage.from(BUCKET).list("imports", { limit: 200 });
  for (const folder of folders ?? []) {
    const prefix = `imports/${folder.name}`;
    const { data: files } = await supabase.storage.from(BUCKET).list(prefix, { limit: 200 });
    const paths =
      files?.filter((f) => f.name.endsWith(".json")).map((f) => `${prefix}/${f.name}`) ?? [];
    if (paths.length) {
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (!error) storageRemoved += paths.length;
    }
  }
  await supabase.storage.from(BUCKET).remove([OVERLAY_PATH]);

  console.log(`Removed ${storageRemoved} storage batch file(s)`);
  console.log("Master employees/departments/designations preserved.");
  console.log("Done.\n");
}

main().catch((error) => {
  console.error("Purge failed:", error);
  process.exit(1);
});
