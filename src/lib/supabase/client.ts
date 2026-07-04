import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

/**
 * Lazily creates the browser Supabase client.
 * Returns null (never throws) when env vars are missing or invalid.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      console.warn(
        "Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }
    cachedClient = null;
    return null;
  }

  try {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
    return cachedClient;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    cachedClient = null;
    return null;
  }
}
