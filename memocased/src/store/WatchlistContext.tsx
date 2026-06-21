// ─────────────────────────────────────────────────────────────────────────────
// WatchlistContext
// Shared source of truth for `watchlist` and `currentlyWatching`. Mounted
// above the router (in main.tsx, alongside UserProvider and DiaryProvider)
// so any page — UserWatchlist's "Start Watching" chevron, a future Home.tsx
// integration, etc. — reads and writes the exact same two arrays.
//
// This mirrors the DiaryContext pattern: the "Start Watching" action is one
// atomic move between two arrays (remove from watchlist, add to currently
// watching), so both arrays live together here rather than as two separate
// contexts that would need careful cross-coordination on every transition.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface WatchlistShowEntry {
  showId: number;
  title: string;
  nextEpisodePointer: string;  // e.g. "S1 · E1"
  releaseYear: number;
  contentRating: string;       // e.g. "TV-14", "TV-MA"
  totalEpisodesCount: number;
  posterUrl: string;            // fully-qualified TMDB CDN URL
}

export interface CurrentlyWatchingEntry {
  showId: number;
  title: string;
  posterUrl: string;
  currentSeason: number;
  currentEpisode: number;
  episodePointer: string;      // derived display string, e.g. "S1 · E1"
}

interface WatchlistContextValue {
  watchlist: WatchlistShowEntry[];
  currentlyWatching: CurrentlyWatchingEntry[];
  /**
   * Atomic transition: removes showId from `watchlist` and appends it to
   * `currentlyWatching`, initialized to Season 1 / Episode 1. Both array
   * updates happen in the same function call so a consumer never observes
   * a state where the show exists in neither array or in both at once.
   */
  handleStartWatching: (showId: number) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// ── Mock seed data ───────────────────────────────────────────────────────────

const MOCK_WATCHLIST: WatchlistShowEntry[] = [
  {
    showId:             125988,
    title:              "Young Sherlock",
    nextEpisodePointer: "S1 · E1",
    releaseYear:        2026,
    contentRating:      "TV-14",
    totalEpisodesCount: 8,
    posterUrl:          "https://image.tmdb.org/t/p/w342/h3s0Cd2JppeWA4UjTuSRauL52P7.jpg",
  },
  {
    showId:             80539,
    title:              "Fallout",
    nextEpisodePointer: "S1 · E1",
    releaseYear:        2024,
    contentRating:      "TV-MA",
    totalEpisodesCount: 8,
    posterUrl:          "https://image.tmdb.org/t/p/w342/c15BtJxCXMrISLVmysdsnZUPQft.jpg",
  },
  {
    showId:             95479,
    title:              "Shōgun",
    nextEpisodePointer: "S1 · E1",
    releaseYear:        2024,
    contentRating:      "TV-MA",
    totalEpisodesCount: 10,
    posterUrl:          "https://image.tmdb.org/t/p/w342/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
  },
  {
    showId:             119051,
    title:              "Wednesday",
    nextEpisodePointer: "S1 · E1",
    releaseYear:        2022,
    contentRating:      "TV-14",
    totalEpisodesCount: 8,
    posterUrl:          "https://image.tmdb.org/t/p/w342/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
  },
  {
    showId:             202250,
    title:              "The Penguin",
    nextEpisodePointer: "S1 · E1",
    releaseYear:        2024,
    contentRating:      "TV-MA",
    totalEpisodesCount: 7,
    posterUrl:          "https://image.tmdb.org/t/p/w342/vOWcqC4oDQws1doDWLO7d3dh5qc.jpg",
  },
  {
    showId:             71912,
    title:              "The Witcher",
    nextEpisodePointer: "S1 · E1",
    releaseYear:        2019,
    contentRating:      "TV-MA",
    totalEpisodesCount: 8,
    posterUrl:          "https://image.tmdb.org/t/p/w342/7vjaCdMw15FEbXyLQTVa04URsPm.jpg",
  },
];

// ── Provider ──────────────────────────────────────────────────────────────────

interface WatchlistProviderProps {
  children: ReactNode;
}

export function WatchlistProvider({ children }: WatchlistProviderProps): React.ReactElement {
  const [watchlist, setWatchlist] = useState<WatchlistShowEntry[]>(MOCK_WATCHLIST);
  const [currentlyWatching, setCurrentlyWatching] = useState<CurrentlyWatchingEntry[]>([]);

  // ── handleStartWatching — the atomic transition ───────────────────────────
  const handleStartWatching = useCallback((showId: number): void => {
    setWatchlist((prevWatchlist) => {
      const target = prevWatchlist.find((show) => show.showId === showId);
      if (!target) return prevWatchlist; // guard — already moved or missing

      // Build the new "currently watching" entry, always Season 1 / Episode 1
      const newlyWatching: CurrentlyWatchingEntry = {
        showId:         target.showId,
        title:          target.title,
        posterUrl:      target.posterUrl,
        currentSeason:  1,
        currentEpisode: 1,
        episodePointer: "S1 · E1",
      };

      setCurrentlyWatching((prevWatching) => {
        // Idempotent guard — never insert the same show twice even under
        // React 18 Strict Mode's intentional double-invocation of updaters
        if (prevWatching.some((s) => s.showId === showId)) return prevWatching;
        return [newlyWatching, ...prevWatching];
      });

      // Remove from watchlist — clean, immutable filter
      return prevWatchlist.filter((show) => show.showId !== showId);
    });
  }, []);

  return (
    <WatchlistContext.Provider
      value={{ watchlist, currentlyWatching, handleStartWatching }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used inside <WatchlistProvider>");
  }
  return ctx;
}