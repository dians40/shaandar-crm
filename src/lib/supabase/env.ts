/** Strip whitespace and surrounding quotes from env values pasted in Vercel/local. */
export function normalizeEnvValue(value: string | undefined): string {
  if (!value) return "";

  let cleaned = value.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

/** Normalize Supabase project URL (add https, remove trailing slash). */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  let url = normalizeEnvValue(raw);
  if (!url) return "";

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

export function isValidSupabaseProjectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      /\.supabase\.(co|in)$/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function readSupabaseUrl(): string {
  return normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
}

export function readSupabaseAnonKey(): string {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function readSupabaseServiceRoleKey(): string {
  return normalizeEnvValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
  );
}
