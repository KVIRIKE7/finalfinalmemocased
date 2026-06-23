// ─────────────────────────────────────────────────────────────────────────────
// UserContext — real Supabase auth session (replaces MOCK_USER)
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser } from "../types/navbar";
import { getCurrentUser, signOut as authSignOut } from "../services/authService";
import { supabase } from "../services/supabase";

// ── Shape ─────────────────────────────────────────────────────────────────────

interface UserContextValue {
  user:       AuthUser | null;
  loading:    boolean;            // true while session is being resolved on load
  setUser:    (user: AuthUser | null) => void;
  signOut:    () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps): React.ReactElement {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ── Rehydrate session on mount ────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then((resolvedUser) => setUser(resolvedUser))
      .finally(() => setLoading(false));

    // Listen for auth changes (sign in / sign out from other tabs, OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const resolvedUser = await getCurrentUser();
          setUser(resolvedUser);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, setUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
