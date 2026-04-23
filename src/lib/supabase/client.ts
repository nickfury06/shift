import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton: every caller shares the same client so GoTrue's
// navigatorLock is acquired once per tab (not once per component).
// Multiple instances race for the same lock and throw
// "Lock was released because another request stole it" under Strict Mode.
let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
