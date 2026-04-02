import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.");
}

let browserClient: SupabaseClient<Database> | null = null;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  const isBrowser = typeof window !== "undefined";
  const t0 = isBrowser ? performance.now() : 0;

  console.log("[SupabaseClient] Creating browser client...", {
    url: supabaseUrl?.substring(0, 40) + "...",
    isBrowser,
    timestamp: new Date().toISOString(),
    persistSession: isBrowser,
    detectSessionInUrl: isBrowser,
  });

  const client = createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: true,
      detectSessionInUrl: isBrowser,
    },
  });

  if (isBrowser) {
    console.log(`[SupabaseClient] Browser client created in ${(performance.now() - t0).toFixed(0)}ms`);
  }

  return client;
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    console.log("[SupabaseClient] Initializing singleton...");
    browserClient = createSupabaseBrowserClient();
  }
  return browserClient;
}

/**
 * Health check: tests if the browser Supabase client can respond to getSession().
 * Returns within 2s or reports a timeout (indicating the client is hung).
 */
export async function checkClientHealth(): Promise<{ ok: boolean; ms: number; hasSession: boolean; error?: string }> {
  const t = typeof window !== "undefined" ? performance.now() : Date.now();
  try {
    const result = await Promise.race([
      getSupabaseBrowserClient().auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Health check timeout (2s)")), 2000)
      ),
    ]);
    const ms = Math.round((typeof window !== "undefined" ? performance.now() : Date.now()) - t);
    const { data, error } = result as any;
    return {
      ok: !error,
      ms,
      hasSession: !!data?.session,
      error: error?.message,
    };
  } catch (e: any) {
    const ms = Math.round((typeof window !== "undefined" ? performance.now() : Date.now()) - t);
    return { ok: false, ms, hasSession: false, error: e?.message };
  }
}

export const supabase = getSupabaseBrowserClient();
