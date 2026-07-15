import path from "path";

/**
 * V15 cloud-safe workspace paths — always relative to repository root.
 * Works identically in local dev, Vercel, and GitHub Codespaces (no hardcoded OS paths).
 */
export function resolveWorkspaceRoot(): string {
  return process.cwd();
}

export function resolveWorkspaceDataDir(): string {
  return path.join(resolveWorkspaceRoot(), "data");
}

export function resolveSupabaseMigrationsDir(): string {
  return path.join(resolveWorkspaceRoot(), "supabase", "migrations");
}

export function resolveMigrationFile(file: string): string {
  return path.join(resolveSupabaseMigrationsDir(), file);
}
