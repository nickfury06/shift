"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (!profile.onboarding_completed && profile.role !== "patron") {
        router.replace("/onboarding");
      } else {
        router.replace("/accueil");
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--terra-medium)", borderTopColor: "transparent" }} />
    </div>
  );
}
