// ─────────────────────────────────────────────────────────────────────────────
// diaryService.ts
// All Supabase calls for diary_logs. Replaces the MOCK_DIARY_LOGS in
// DiaryContext.tsx — swap the context's useState seed for these fetches.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabase";
import type { DiaryLogEntry } from "../store/DiaryContext";
import type { LogEntry } from "../types/navbar";

// ── Fetch ─────────────────────────────────────────────────────────────────────

/** Returns all diary logs for a given username, newest first. */
export async function fetchDiaryLogs(username: string): Promise<DiaryLogEntry[]> {
  // 1. Resolve username → user_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (profileError || !profile) return [];

  // 2. Fetch logs
  const { data, error } = await supabase
    .from("diary_logs")
    .select("*")
    .eq("user_id", profile.id)
    .order("date_logged", { ascending: false })
    .order("created_at",  { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    logId:        row.id,
    showId:       row.tmdb_show_id,
    title:        row.title,
    seasonNumber: row.season_number,
    posterUrl:    row.poster_url ?? "",
    dateLogged:   row.date_logged,
    rating:       row.rating ?? 0,
    isFavorite:   row.is_favorite,
    reviewText:   row.review_text ?? undefined,
  }));
}

// ── Create ────────────────────────────────────────────────────────────────────

/** Saves a new log entry from the LogModal's save callback. */
export async function createDiaryLog(
  userId: string,
  entry: LogEntry
): Promise<DiaryLogEntry | null> {
  const dateLogged = entry.watchedDate ?? new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("diary_logs")
    .insert({
      user_id:       userId,
      tmdb_show_id:  entry.showId,
      title:         entry.title,
      season_number: entry.season,
      poster_url:    entry.posterUrl ?? null,
      date_logged:   dateLogged,
      rating:        entry.rating > 0 ? entry.rating : null,
      is_favorite:   entry.isLiked,
      review_text:   entry.review.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[diaryService] createDiaryLog:", error?.message);
    return null;
  }

  return {
    logId:        data.id,
    showId:       data.tmdb_show_id,
    title:        data.title,
    seasonNumber: data.season_number,
    posterUrl:    data.poster_url ?? "",
    dateLogged:   data.date_logged,
    rating:       data.rating ?? 0,
    isFavorite:   data.is_favorite,
    reviewText:   data.review_text ?? undefined,
  };
}

// ── Update ────────────────────────────────────────────────────────────────────

/** Updates an existing diary log entry (the edit-pencil flow in UserDiary). */
export async function updateDiaryLog(
  logId:   string,
  updates: Partial<Pick<DiaryLogEntry, "rating" | "isFavorite" | "reviewText" | "dateLogged">>
): Promise<boolean> {
  const { error } = await supabase
    .from("diary_logs")
    .update({
      ...(updates.rating      !== undefined && { rating:      updates.rating > 0 ? updates.rating : null }),
      ...(updates.isFavorite  !== undefined && { is_favorite: updates.isFavorite }),
      ...(updates.reviewText  !== undefined && { review_text: updates.reviewText || null }),
      ...(updates.dateLogged  !== undefined && { date_logged: updates.dateLogged }),
    })
    .eq("id", logId);

  if (error) {
    console.error("[diaryService] updateDiaryLog:", error.message);
    return false;
  }
  return true;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteDiaryLog(logId: string): Promise<boolean> {
  const { error } = await supabase
    .from("diary_logs")
    .delete()
    .eq("id", logId);

  if (error) {
    console.error("[diaryService] deleteDiaryLog:", error.message);
    return false;
  }
  return true;
}
