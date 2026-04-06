"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile && !profile.onboarding_completed && profile.role !== "patron") {
      router.push("/onboarding");
    }
  }, [profile, loading, router]);

  return <>{children}</>;
}
