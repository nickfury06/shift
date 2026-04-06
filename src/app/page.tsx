import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to determine role and onboarding status
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.role === "patron") {
    redirect("/dashboard");
  }

  // Staff/responsable who haven't completed onboarding
  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  redirect("/tonight");
}
