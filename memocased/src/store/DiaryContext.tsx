// ─────────────────────────────────────────────────────────────────────────────
// DiaryContext — persists to Supabase
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useUser } from "./UserContext";
import {
  fetchDiaryLogs,
  createDiaryLog,
  updateDiaryLog,
  deleteDiaryLog,
} from "../services/diaryService";
import type { LogEntry } from "../types/navbar";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiaryLogEntry {
  logId:        string;
  showId:       number;
  title:        string;
  seasonNumber: number;
  posterUrl:    string;
  dateLogged:   string;
  rating:       number;
  isFavorite:   boolean;
  reviewText?:  string;
}

interface DiaryContextValue {
  diaryLogs:      DiaryLogEntry[];
  loading:        boolean;
  setDiaryLogs:   Dispatch<SetStateAction<DiaryLogEntry[]>>;
  addLogEntry:    (entry: LogEntry)                                   => Promise<void>;
  updateLogEntry: (logId: string, updates: Partial<DiaryLogEntry>)   => Promise<void>;
  removeLogEntry: (logId: string)                                     => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const DiaryContext = createContext<DiaryContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function DiaryProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { user } = useUser();
  const [diaryLogs, setDiaryLogs] = useState<DiaryLogEntry[]>([]);
  const [loading,   setLoading]   = useState(false);

  // Load from Supabase when user logs in / changes
  useEffect(() => {
    if (!user) { setDiaryLogs([]); return; }
    setLoading(true);
    fetchDiaryLogs(user.username)
      .then(setDiaryLogs)
      .finally(() => setLoading(false));
  }, [user]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const addLogEntry = useCallback(async (entry: LogEntry): Promise<void> => {
    // Optimistic local entry while DB call is in flight
    const tempId    = `temp-${Date.now()}`;
    const finalDate = entry.watchedDate || new Date().toISOString().split("T")[0];
    const optimistic: DiaryLogEntry = {
      logId:        tempId,
      showId:       entry.showId,
      title:        entry.title,
      seasonNumber: entry.season,
      posterUrl:    entry.posterUrl ?? "",
      dateLogged:   finalDate,
      rating:       entry.rating,
      isFavorite:   entry.isLiked,
      reviewText:   entry.review.trim() || undefined,
    };
    setDiaryLogs((prev) => [optimistic, ...prev]);

    if (user) {
      const saved = await createDiaryLog(user.id, entry);
      if (saved) {
        // Replace temp entry with the real DB row (gets the real UUID)
        setDiaryLogs((prev) =>
          prev.map((l) => (l.logId === tempId ? saved : l))
        );
      } else {
        // Rollback on failure
        setDiaryLogs((prev) => prev.filter((l) => l.logId !== tempId));
      }
    }
  }, [user]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateLogEntry = useCallback(async (
    logId:   string,
    updates: Partial<DiaryLogEntry>
  ): Promise<void> => {
    // Optimistic
    setDiaryLogs((prev) =>
      prev.map((l) => (l.logId === logId ? { ...l, ...updates } : l))
    );

    if (user) {
      const ok = await updateDiaryLog(logId, updates);
      if (!ok) {
        // Refetch to restore correct state
        fetchDiaryLogs(user.username).then(setDiaryLogs);
      }
    }
  }, [user]);

  // ── Remove ────────────────────────────────────────────────────────────────
  const removeLogEntry = useCallback(async (logId: string): Promise<void> => {
    const removed = diaryLogs.find((l) => l.logId === logId);
    setDiaryLogs((prev) => prev.filter((l) => l.logId !== logId));

    if (user) {
      const ok = await deleteDiaryLog(logId);
      if (!ok && removed) {
        setDiaryLogs((prev) => [removed, ...prev]);
      }
    }
  }, [user, diaryLogs]);

  return (
    <DiaryContext.Provider value={{
      diaryLogs,
      loading,
      setDiaryLogs,
      addLogEntry,
      updateLogEntry,
      removeLogEntry,
    }}>
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
