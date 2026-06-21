// ─────────────────────────────────────────────────────────────────────────────
// DiaryContext
// Shared source of truth for diaryLogs. Mounted above the router (in
// main.tsx, alongside UserProvider) so any component — the global Navbar's
// LogModal save handler, the UserDiary page, a future Reviews page, etc. —
// reads and writes the exact same array. This is what fixes the sync bug:
// previously Navbar.tsx only console.logged a saved entry, and UserDiary.tsx
// held its own isolated useState seeded from mock data. Neither file could
// see the other's writes.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LogEntry } from "../types/navbar";

// ── Shape ─────────────────────────────────────────────────────────────────────

export interface DiaryLogEntry {
  logId: string;         // unique entry identifier
  showId: number;
  title: string;
  seasonNumber: number;
  posterUrl: string;      // fully-qualified TMDB CDN URL
  dateLogged: string;     // "YYYY-MM-DD"
  rating: number;         // 0–5, 0 = unrated
  isFavorite: boolean;
  reviewText?: string;
}

interface DiaryContextValue {
  diaryLogs: DiaryLogEntry[];
  setDiaryLogs: Dispatch<SetStateAction<DiaryLogEntry[]>>;
  /**
   * Single entry point for the LogModal's save callback. Converts the
   * modal's generic LogEntry shape into a DiaryLogEntry, applies the
   * today's-date fallback, generates a unique logId, and prepends it
   * to diaryLogs — all in one immutable functional update.
   */
  addLogEntry: (entry: LogEntry) => void;
  /**
   * Updates one existing entry in place by logId — used by the diary
   * page's pencil-edit flow. Does not change array order; the diary
   * page's own sort handles re-ordering on render.
   */
  updateLogEntry: (logId: string, updates: Partial<DiaryLogEntry>) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const DiaryContext = createContext<DiaryContextValue | null>(null);

// ── Mock seed data — replace with a real fetch once a backend exists ─────────

const MOCK_DIARY_LOGS: DiaryLogEntry[] = [
  {
    logId:        "log-001",
    showId:       136315,
    title:        "The Bear",
    seasonNumber: 2,
    posterUrl:    "https://image.tmdb.org/t/p/w185/4fVddnbhcmzRZE14NJY03GKS6Fn.jpg",
    dateLogged:   "2026-06-15",
    rating:       5,
    isFavorite:   true,
    reviewText:   "Best season of TV this year, full stop.",
  },
  {
    logId:        "log-002",
    showId:       66732,
    title:        "Stranger Things",
    seasonNumber: 3,
    posterUrl:    "https://image.tmdb.org/t/p/w185/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    dateLogged:   "2026-06-15",
    rating:       4,
    isFavorite:   false,
  },
  {
    logId:        "log-003",
    showId:       1399,
    title:        "Game of Thrones",
    seasonNumber: 6,
    posterUrl:    "https://image.tmdb.org/t/p/w185/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    dateLogged:   "2026-06-02",
    rating:       5,
    isFavorite:   true,
    reviewText:   "That ending sequence is still unmatched.",
  },
  {
    logId:        "log-004",
    showId:       1622,
    title:        "Suits",
    seasonNumber: 1,
    posterUrl:    "https://image.tmdb.org/t/p/w342/vQiryp6LioFxQThywxbC6TuoDjy.jpg",
    dateLogged:   "2026-05-28",
    rating:       3,
    isFavorite:   false,
  },
  {
    logId:        "log-005",
    showId:       87108,
    title:        "Chernobyl",
    seasonNumber: 1,
    posterUrl:    "https://image.tmdb.org/t/p/w185/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    dateLogged:   "2026-05-09",
    rating:       5,
    isFavorite:   true,
    reviewText:   "Devastating. Essential viewing.",
  },
];

// ── Provider ──────────────────────────────────────────────────────────────────

interface DiaryProviderProps {
  children: ReactNode;
}

export function DiaryProvider({ children }: DiaryProviderProps): React.ReactElement {
  const [diaryLogs, setDiaryLogs] = useState<DiaryLogEntry[]>(MOCK_DIARY_LOGS);

  // ── addLogEntry — the bridge from LogModal's save callback ─────────────────
  const addLogEntry = useCallback((entry: LogEntry): void => {
    // Today's-date fallback: belt-and-suspenders alongside the fallback
    // already applied inside LogModal's own handleSave. Guards against any
    // future caller of addLogEntry that doesn't go through that path.
    const finalDate = entry.watchedDate || new Date().toISOString().split("T")[0];

    const finalLogItem: DiaryLogEntry = {
      logId:        `log-${Date.now()}`, // unique, monotonically increasing per save
      showId:       entry.showId,
      title:        entry.title,
      seasonNumber: entry.season,
      posterUrl:    entry.posterUrl ?? "",
      dateLogged:   finalDate,
      rating:       entry.rating,
      isFavorite:   entry.isLiked,
      reviewText:   entry.review.trim().length > 0 ? entry.review : undefined,
    };

    // Immutable prepend — newest entry first. UserDiary's own sort is the
    // real ordering guarantee, but prepending keeps insertion order sane
    // even before that sort runs.
    setDiaryLogs((prevLogs) => [finalLogItem, ...prevLogs]);
  }, []);

  // ── updateLogEntry — used by the diary page's edit-pencil flow ─────────────
  const updateLogEntry = useCallback(
    (logId: string, updates: Partial<DiaryLogEntry>): void => {
      setDiaryLogs((prevLogs) =>
        prevLogs.map((log) =>
          log.logId === logId ? { ...log, ...updates } : log
        )
      );
    },
    []
  );

  return (
    <DiaryContext.Provider
      value={{ diaryLogs, setDiaryLogs, addLogEntry, updateLogEntry }}
    >
      {children}
    </DiaryContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDiary(): DiaryContextValue {
  const ctx = useContext(DiaryContext);
  if (!ctx) {
    throw new Error("useDiary must be used inside <DiaryProvider>");
  }
  return ctx;
}