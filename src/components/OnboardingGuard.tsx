"use client";

import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirects non-patron users whose `onboarding_completed` is false to
 * `/onboarding`. Never blocks the subtree render — children always mount,
 * so the Nav/DesktopNav stay visible during transient auth re-checks
 * (HMR, realtime updates, token refresh).
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!profile) return;
    if (profile.role === "patron") return;
    if (profile.onboarding_completed) return;
    if (pathname === "/onboarding") return;
    router.replace("/onboarding");
  }, [loading, profile, pathname, router]);

  return <>{children}</>;
}
