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

/** Normalize Supabase project URL (add https, domain suffix, remove trailing slash). */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  let url = normalizeEnvValue(raw);
  if (!url) return "";

  // Bare project ref pasted without domain, e.g. "kmybydpbfdguavnzfltp"
  if (/^[a-z0-9-]+$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  url = url.replace(/\/+$/, "");

  // Common paste mistake: REST endpoint instead of project root URL
  url = url.replace(/\/rest\/v1\/?$/i, "");

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;

    // Common Vercel paste mistake: https://PROJECT_REF (no .supabase.co)
    if (host && !host.includes(".") && /^[a-z0-9-]+$/i.test(host)) {
      return `https://${host}.supabase.co`;
    }
  } catch {
    return "";
  }

  return url;
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
