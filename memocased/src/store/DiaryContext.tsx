// ─────────────────────────────────────────────────────────────────────────────
// DiaryContext
// Shared source of truth for diaryLogs. Mounted above the router in main.tsx.
// No mock data — starts empty, entries added via addLogEntry from LogModal.
// When Supabase services are wired in, swap the useState seed for a useEffect
// fetch using fetchDiaryLogs() from services/diaryService.ts.
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiaryLogEntry {
  logId:        string;
  showId:       number;
  title:        string;
  seasonNumber: number;
  posterUrl:    string;
  dateLogged:   string;   // "YYYY-MM-DD"
  rating:       number;   // 0–5, 0 = unrated
  isFavorite:   boolean;
  reviewText?:  string;
}

interface DiaryContextValue {
  diaryLogs:      DiaryLogEntry[];
  setDiaryLogs:   Dispatch<SetStateAction<DiaryLogEntry[]>>;
  addLogEntry:    (entry: LogEntry) => void;
  updateLogEntry: (logId: string, updates: Partial<DiaryLogEntry>) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const DiaryContext = createContext<DiaryContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function DiaryProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [diaryLogs, setDiaryLogs] = useState<DiaryLogEntry[]>([]);

  const addLogEntry = useCallback((entry: LogEntry): void => {
    const finalDate = entry.watchedDate || new Date().toISOString().split("T")[0];
    const newEntry: DiaryLogEntry = {
      logId:        `log-${Date.now()}`,
      showId:       entry.showId,
      title:        entry.title,
      seasonNumber: entry.season,
      posterUrl:    entry.posterUrl ?? "",
      dateLogged:   finalDate,
      rating:       entry.rating,
      isFavorite:   entry.isLiked,
      reviewText:   entry.review.trim().length > 0 ? entry.review : undefined,
    };
    setDiaryLogs((prev) => [newEntry, ...prev]);
  }, []);

  const updateLogEntry = useCallback(
    (logId: string, updates: Partial<DiaryLogEntry>): void => {
      setDiaryLogs((prev) =>
        prev.map((log) => (log.logId === logId ? { ...log, ...updates } : log))
      );
    },
    []
  );

  return (
    <DiaryContext.Provider value={{ diaryLogs, setDiaryLogs, addLogEntry, updateLogEntry }}>
      {children}
    </DiaryContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDiary(): DiaryContextValue {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error("useDiary must be used inside <DiaryProvider>");
  return ctx;
}
