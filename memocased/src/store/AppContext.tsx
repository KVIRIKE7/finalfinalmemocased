// ─────────────────────────────────────────────────────────────────────────────
// AppContext
// Core global state engine: tracked shows (watching/watchlist/dropped),
// favorites, and the active username. Mount <AppProvider> above the router
// (alongside UserProvider, DiaryProvider, WatchlistProvider in main.tsx) so
// every page reads and writes the exact same in-memory store, removing the
// need for page-local mock data.
//
// NOTE ON OVERLAP: this app already has a separate WatchlistContext
// (src/store/WatchlistContext.tsx) modelling watchlist/currentlyWatching as
// two distinct arrays. This file was requested as a fresh, self-contained
// context using a different shape (one trackedShows array with a `status`
// field) — it does not replace or merge with WatchlistContext. Reconciling
// the two into a single source of truth is a separate decision, not made
// here, since it wasn't part of this request.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATE INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type ShowStatus = "watching" | "watchlist" | "dropped";

export interface TrackedShow {
  id: number;
  name: string;
  poster_path: string;
  status: ShowStatus;
}

export interface AppContextType {
  trackedShows: TrackedShow[];
  /** Favorites are capped at 4 entries — see addFavorite/enforcement below. */
  favorites: TrackedShow[];
  username: string;
  /**
   * Adds, updates, or removes a show from trackedShows depending on the
   * show's current presence in the array and the requested newStatus.
   * Pass "removed" to take a show out of tracking entirely.
   */
  updateShowStatus: (
    show: TrackedShow,
    newStatus: ShowStatus | "removed"
  ) => void;
  setUsername: (username: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// MAX FAVORITES CONSTANT
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FAVORITES = 4;

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps): React.ReactElement {
  const [trackedShows, setTrackedShows] = useState<TrackedShow[]>([]);
  // `favorites` exists as plain state per the spec — note that no mutator
  // for it (e.g. addFavorite) is part of AppContextType in this request,
  // unlike trackedShows which gets updateShowStatus. MAX_FAVORITES documents
  // the 4-entry cap mentioned in the spec's interface description; the next
  // function that adds to this list should enforce it via
  // `.slice(0, MAX_FAVORITES)` rather than rediscovering the limit.
  const [favorites, setFavorites] = useState<TrackedShow[]>([]);
  const [username, setUsername] = useState<string>("");

  // ── updateShowStatus — the core list-transition logic ────────────────────
  const updateShowStatus = useCallback(
    (show: TrackedShow, newStatus: ShowStatus | "removed"): void => {
      setTrackedShows((prevShows) => {
        const existingIndex = prevShows.findIndex((s) => s.id === show.id);
        const exists = existingIndex !== -1;

        // ── Case 1: exists, and the caller wants it gone entirely ──────────
        if (exists && newStatus === "removed") {
          return prevShows.filter((s) => s.id !== show.id);
        }

        // "removed" only makes sense as a removal instruction — if the show
        // doesn't exist yet, there's nothing to remove, so do nothing.
        if (!exists && newStatus === "removed") {
          return prevShows;
        }

        // From here on, newStatus is guaranteed to be a real ShowStatus
        // (TypeScript doesn't narrow this automatically across the two
        // guards above, so it's asserted once here for the remaining logic).
        const resolvedStatus = newStatus as ShowStatus;

        // ── Case 2: exists, status is actually changing — update in place ──
        if (exists) {
          if (prevShows[existingIndex].status === resolvedStatus) {
            return prevShows; // no-op: status unchanged, avoid a needless render
          }
          return prevShows.map((s) =>
            s.id === show.id ? { ...s, ...show, status: resolvedStatus } : s
          );
        }

        // ── Case 3: doesn't exist — append as a new tracked show ───────────
        return [...prevShows, { ...show, status: resolvedStatus }];
      });
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        trackedShows,
        favorites,
        username,
        updateShowStatus,
        setUsername,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside <AppProvider>");
  }
  return ctx;
}