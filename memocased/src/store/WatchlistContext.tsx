// ─────────────────────────────────────────────────────────────────────────────
// WatchlistContext
// Shared source of truth for watchlist and currentlyWatching.
// No mock data — starts empty, populated by user actions.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

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
  handleStartWatching: (showId: number) => void;
  addToWatchlist:      (show: WatchlistShowEntry) => void;
  removeFromWatchlist: (showId: number) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function WatchlistProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [watchlist,         setWatchlist]         = useState<WatchlistShowEntry[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<CurrentlyWatchingEntry[]>([]);

  // Move show from watchlist → currentlyWatching
  const handleStartWatching = useCallback((showId: number): void => {
    setWatchlist((prev) => {
      const target = prev.find((s) => s.showId === showId);
      if (!target) return prev;

      setCurrentlyWatching((cw) => {
        if (cw.some((s) => s.showId === showId)) return cw;
        return [{
          showId:         target.showId,
          title:          target.title,
          posterUrl:      target.posterUrl,
          currentSeason:  1,
          currentEpisode: 1,
          episodePointer: "S1 · E1",
        }, ...cw];
      });

      return prev.filter((s) => s.showId !== showId);
    });
  }, []);

  // Add a show to the watchlist (from ShowDetail page etc.)
  const addToWatchlist = useCallback((show: WatchlistShowEntry): void => {
    setWatchlist((prev) => {
      if (prev.some((s) => s.showId === show.showId)) return prev;
      return [show, ...prev];
    });
  }, []);

  // Remove without watching
  const removeFromWatchlist = useCallback((showId: number): void => {
    setWatchlist((prev) => prev.filter((s) => s.showId !== showId));
  }, []);

  return (
    <WatchlistContext.Provider
      value={{ watchlist, currentlyWatching, handleStartWatching, addToWatchlist, removeFromWatchlist }}
    >
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
