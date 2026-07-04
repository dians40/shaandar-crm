import { createClient } from "@supabase/supabase-js";
import {
  isValidSupabaseProjectUrl,
  readSupabaseServiceRoleKey,
  readSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Server-only admin client. Uses service role key — never expose to the browser.
 * Bypasses RLS; used by API routes until Supabase Auth is fully wired.
 */
export function createAdminClient() {
  const url = readSupabaseUrl();
  const serviceRoleKey = readSupabaseServiceRoleKey();

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
  const url = readSupabaseUrl();
  const serviceRoleKey = readSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in Vercel → Settings → Environment Variables (or .env.local locally), then redeploy.";
  }

  if (looksLikePlaceholder(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL still has placeholder text. Paste your real Supabase project URL.";
  }

  if (looksLikePlaceholder(serviceRoleKey)) {
    return "SUPABASE_SERVICE_ROLE_KEY still has placeholder text. Paste your real service_role key.";
  }

  if (!isValidSupabaseProjectUrl(url)) {
    return `NEXT_PUBLIC_SUPABASE_URL must look like https://YOUR_PROJECT_REF.supabase.co (current value starts with "${url.slice(0, 30)}..."). Copy it from Supabase Dashboard → Project Settings → API → Project URL.`;
  }

  return null;
}

export function isSupabaseServerConfigured(): boolean {
  return getSupabaseConfigIssue() === null;
}
