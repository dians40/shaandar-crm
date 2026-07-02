/**
 * Load env vars from .env.local and optional .env (for check script & tooling).
 */
import fs from "fs";
import path from "path";

export function loadProjectEnv(root = process.cwd()) {
  const merged = { ...process.env };

  for (const file of [".env.local", ".env"]) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      merged[key] = value;
    }
  }

  return merged;
}

export function resolveSupabaseEnv(env = loadProjectEnv()) {
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    env.SUPABASE_URL?.trim() ||
    "";
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    env.SUPABASE_SERVICE_KEY?.trim() ||
    "";
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    env.SUPABASE_ANON_KEY?.trim() ||
    "";

  return { url, serviceRoleKey, anonKey };
}
