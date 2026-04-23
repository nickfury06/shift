"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function route() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          router.replace("/login");
        } else {
          // Onboarding enforcement happens inside the (app) layout via
          // OnboardingGuard, which reads profile from AuthProvider. We just
          // punt the user into the app and let the guard redirect as needed.
          router.replace("/accueil");
        }
      } catch {
        if (!cancelled) router.replace("/login");
      }
    }

    route();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--terra-medium)", borderTopColor: "transparent" }} />
    </div>
  );
}
