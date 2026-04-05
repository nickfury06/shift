"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import type { User, SupabaseClient } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data as Profile | null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Keep a stable reference to the Supabase client
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let mounted = true;

    async function loadProfile(authUser: User) {
      const p = await fetchProfile(supabase, authUser.id);
      if (mounted) {
        setUser(authUser);
        setProfile(p);
        setLoading(false);
      }
    }

    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        if (mounted) setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setLoading(false);
          router.push("/login");
        } else if (event === "SIGNED_IN" && session?.user) {
          loadProfile(session.user);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Just update user, keep existing profile
          setUser(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext>
  );
}
