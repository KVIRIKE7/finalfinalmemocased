// ─────────────────────────────────────────────────────────────────────────────
// UserContext
// Lightweight auth state for the currently signed-in user.
// Replace the mock initialisation with your real auth service later.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser } from "../types/navbar";

// ── Shape ─────────────────────────────────────────────────────────────────────

interface UserContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  signOut: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);

// ── Mock initial user — swap this for real session hydration ──────────────────

const MOCK_USER: AuthUser = {
  id: "usr_001",
  username: "janedoe",
  displayName: "Jane Doe",
  avatarUrl: null, // set to a URL string to show a real avatar
};

// ── Provider ──────────────────────────────────────────────────────────────────

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps): React.ReactElement {
  // Initialise with mock user so the navbar renders immediately during dev.
  // In production, replace with: useState<AuthUser | null>(null) and hydrate
  // from your auth service on mount.
  const [user, setUser] = useState<AuthUser | null>(MOCK_USER);

  const signOut = useCallback(() => {
    setUser(null);
    // Your auth service call here: authService.signOut()
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return ctx;
}