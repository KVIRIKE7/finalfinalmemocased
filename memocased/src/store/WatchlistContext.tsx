// ─────────────────────────────────────────────────────────────────────────────
// WatchlistContext — persists to Supabase
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useUser } from "./UserContext";
import {
  fetchWatchlist,
  addToWatchlist    as dbAdd,
  removeFromWatchlist as dbRemove,
  fetchCurrentlyWatching,
  startWatching     as dbStartWatching,
} from "../services/watchlistService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WatchlistShowEntry {
  showId:             number;
  title:              string;
  nextEpisodePointer: string;
  releaseYear:        number;
  contentRating:      string;
  totalEpisodesCount: number;
  posterUrl:          string;
}

export interface CurrentlyWatchingEntry {
  showId:         number;
  title:          string;
  posterUrl:      string;
  currentSeason:  number;
  currentEpisode: number;
  episodePointer: string;
}

interface WatchlistContextValue {
  watchlist:           WatchlistShowEntry[];
  currentlyWatching:   CurrentlyWatchingEntry[];
  loading:             boolean;
  isInWatchlist:       (showId: number) => boolean;
  isWatching:          (showId: number) => boolean;
  addToWatchlist:      (show: Omit<WatchlistShowEntry, "nextEpisodePointer">) => Promise<void>;
  removeFromWatchlist: (showId: number) => Promise<void>;
  handleStartWatching: (showId: number) => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function WatchlistProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { user } = useUser();

  const [watchlist,         setWatchlist]         = useState<WatchlistShowEntry[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<CurrentlyWatchingEntry[]>([]);
  const [loading,           setLoading]           = useState(false);

  // Load from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      setCurrentlyWatching([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchWatchlist(user.id),
      fetchCurrentlyWatching(user.id),
    ])
      .then(([wl, cw]) => {
        setWatchlist(wl);
        setCurrentlyWatching(cw);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isInWatchlist = useCallback(
    (showId: number) => watchlist.some((s) => s.showId === showId),
    [watchlist]
  );

  const isWatching = useCallback(
    (showId: number) => currentlyWatching.some((s) => s.showId === showId),
    [currentlyWatching]
  );

  // ── Add to watchlist ──────────────────────────────────────────────────────
  const addToWatchlist = useCallback(async (
    show: Omit<WatchlistShowEntry, "nextEpisodePointer">
  ): Promise<void> => {
    // Optimistic update
    const entry: WatchlistShowEntry = { ...show, nextEpisodePointer: "S1 · E1" };
    setWatchlist((prev) =>
      prev.some((s) => s.showId === show.showId) ? prev : [entry, ...prev]
    );

    if (user) {
      const ok = await dbAdd(user.id, show);
      if (!ok) {
        // Rollback on failure
        setWatchlist((prev) => prev.filter((s) => s.showId !== show.showId));
      }
    }
  }, [user]);

  // ── Remove from watchlist ─────────────────────────────────────────────────
  const removeFromWatchlist = useCallback(async (showId: number): Promise<void> => {
    const removed = watchlist.find((s) => s.showId === showId);
    setWatchlist((prev) => prev.filter((s) => s.showId !== showId));

    if (user) {
      const ok = await dbRemove(user.id, showId);
      if (!ok && removed) {
        setWatchlist((prev) => [removed, ...prev]);
      }
    }
  }, [user, watchlist]);

  // ── Start watching (watchlist → show_progress) ────────────────────────────
  const handleStartWatching = useCallback(async (showId: number): Promise<void> => {
    const target = watchlist.find((s) => s.showId === showId);
    if (!target) return;

    // Optimistic update
    setWatchlist((prev) => prev.filter((s) => s.showId !== showId));
    const cwEntry: CurrentlyWatchingEntry = {
      showId:         target.showId,
      title:          target.title,
      posterUrl:      target.posterUrl,
      currentSeason:  1,
      currentEpisode: 1,
      episodePointer: "S1 · E1",
    };
    setCurrentlyWatching((prev) =>
      prev.some((s) => s.showId === showId) ? prev : [cwEntry, ...prev]
    );

    if (user) {
      const ok = await dbStartWatching(user.id, showId);
      if (!ok) {
        // Rollback
        setCurrentlyWatching((prev) => prev.filter((s) => s.showId !== showId));
        setWatchlist((prev) => [target, ...prev]);
      }
    }
  }, [user, watchlist]);

  return (
    <WatchlistContext.Provider value={{
      watchlist,
      currentlyWatching,
      loading,
      isInWatchlist,
      isWatching,
      addToWatchlist,
      removeFromWatchlist,
      handleStartWatching,
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used inside <WatchlistProvider>");
  return ctx;
}
