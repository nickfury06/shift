import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton on globalThis so HMR / Fast Refresh reloads reuse the same
// client. A fresh Supabase client on every module reload spawned multiple
// GoTrue instances, each racing for the navigatorLock.
//
// We also pass a no-op lock via auth options: we don't need cross-tab
// session coordination, and the default navigator lock produces noisy
// "Lock was released because another request stole it" errors during
// dev HMR / Strict Mode remounts.

declare global {
  // eslint-disable-next-line no-var
  var __shiftSupabaseClient: SupabaseClient | undefined;
}

async function noopLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  return fn();
}

export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { lock: noopLock } }
    );
  }
  if (!globalThis.__shiftSupabaseClient) {
    globalThis.__shiftSupabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { lock: noopLock } }
    );
  }
  return globalThis.__shiftSupabaseClient;
}
