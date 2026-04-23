import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React Strict Mode double-mount in dev.
  // Supabase's GoTrue client uses navigatorLock for token refresh, which
  // Strict Mode's double-mount pattern corrupts ("Lock was released
  // because another request stole it"). The warning is a dev-only
  // artifact — production doesn't double-mount.
  reactStrictMode: false,
};

export default nextConfig;
