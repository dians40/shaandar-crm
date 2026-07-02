import { createClient } from "@supabase/supabase-js";

/**
 * Server-only admin client. Uses service role key — never expose to the browser.
 * Bypasses RLS; used by API routes until Supabase Auth is fully wired.
 */
export function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const PLACEHOLDER_PATTERNS = [
  "YOUR_PROJECT_REF",
  "your-anon-key-here",
  "your-service-role-key-here",
  "placeholder",
  "example.com",
  "xxxxx",
];

function looksLikePlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) =>
    lower.includes(pattern.toLowerCase())
  );
}

export function getSupabaseConfigIssue(): string | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!url?.trim() || !serviceRoleKey?.trim()) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local";
  }

  if (looksLikePlaceholder(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL still has placeholder text. Paste your real Supabase project URL.";
  }

  if (looksLikePlaceholder(serviceRoleKey)) {
    return "SUPABASE_SERVICE_ROLE_KEY still has placeholder text. Paste your real service_role key.";
  }

  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    return "NEXT_PUBLIC_SUPABASE_URL must look like https://abcdefgh.supabase.co";
  }

  return null;
}

export function isSupabaseServerConfigured(): boolean {
  return getSupabaseConfigIssue() === null;
}
