"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

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

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const supabase = supabaseRef.current;

    async function fetchProfile(userId: string) {
      // Race the query against a timeout so a stuck network call never
      // freezes the whole app on an infinite spinner.
      const query = supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const timeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 8000)
      );
      try {
        const { data } = await Promise.race([query, timeout]);
        if (data) setProfile(data as Profile);
      } catch {
        // swallow — leaves profile null, app shell still renders
      }
    }

    // Safety net: if nothing flips loading to false within 10s, bail out
    // so the user at least sees the login page instead of a dead spinner.
    const bailout = setTimeout(() => setLoading(false), 10000);

    // Use onAuthStateChange as the single source of truth
    // This avoids the lock conflict with getSession()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
      clearTimeout(bailout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(bailout);
    };
  }, []);

  async function signOut() {
    await supabaseRef.current.auth.signOut();
    setUser(null);
    setProfile(null);
    // Clear per-user client cache so next sign-in starts clean.
    if (typeof window !== "undefined") {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("shift-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
