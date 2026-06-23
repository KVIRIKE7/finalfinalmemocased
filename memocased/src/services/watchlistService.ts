// ─────────────────────────────────────────────────────────────────────────────
// watchlistService.ts
// Supabase calls for watchlist and show_progress tables.
// Replaces the MOCK_WATCHLIST in WatchlistContext.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabase";
import type { WatchlistShowEntry, CurrentlyWatchingEntry } from "../store/WatchlistContext";

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchWatchlist(userId: string): Promise<WatchlistShowEntry[]> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    showId:             row.tmdb_show_id,
    title:              row.title,
    nextEpisodePointer: "S1 · E1",
    releaseYear:        row.release_year ?? 0,
    contentRating:      row.content_rating ?? "",
    totalEpisodesCount: row.total_episodes_count ?? 0,
    posterUrl:          row.poster_url ?? "",
  }));
}

export async function addToWatchlist(
  userId: string,
  show: Omit<WatchlistShowEntry, "nextEpisodePointer">
): Promise<boolean> {
  const { error } = await supabase
    .from("watchlist")
    .upsert({
      user_id:              userId,
      tmdb_show_id:         show.showId,
      title:                show.title,
      poster_url:           show.posterUrl,
      release_year:         show.releaseYear,
      content_rating:       show.contentRating,
      total_episodes_count: show.totalEpisodesCount,
    }, { onConflict: "user_id,tmdb_show_id" });

  if (error) {
    console.error("[watchlistService] addToWatchlist:", error.message);
    return false;
  }
  return true;
}

export async function removeFromWatchlist(
  userId:      string,
  tmdbShowId:  number
): Promise<boolean> {
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("tmdb_show_id", tmdbShowId);

  if (error) {
    console.error("[watchlistService] removeFromWatchlist:", error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOW PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShowProgress(
  userId: string,
  status?: "watching" | "completed" | "dropped"
) {
  let query = supabase
    .from("show_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export async function fetchCurrentlyWatching(userId: string): Promise<CurrentlyWatchingEntry[]> {
  const { data, error } = await supabase
    .from("show_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "watching")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    showId:         row.tmdb_show_id,
    title:          row.title,
    posterUrl:      row.poster_url ?? "",
    currentSeason:  row.current_season ?? 1,
    currentEpisode: row.current_episode ?? 1,
    episodePointer: `S${row.current_season ?? 1} · E${row.current_episode ?? 1}`,
  }));
}

/** Atomically moves a show from watchlist → show_progress (watching). */
export async function startWatching(
  userId:     string,
  tmdbShowId: number
): Promise<boolean> {
  // 1. Get show details from watchlist
  const { data: wlRow } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .eq("tmdb_show_id", tmdbShowId)
    .single();

  if (!wlRow) return false;

  // 2. Upsert into show_progress
  const { error: progressError } = await supabase
    .from("show_progress")
    .upsert({
      user_id:          userId,
      tmdb_show_id:     tmdbShowId,
      title:            wlRow.title,
      poster_url:       wlRow.poster_url,
      total_episodes:   wlRow.total_episodes_count ?? 0,
      episodes_watched: 0,
      current_season:   1,
      current_episode:  1,
      status:           "watching",
    }, { onConflict: "user_id,tmdb_show_id" });

  if (progressError) {
    console.error("[watchlistService] startWatching progress:", progressError.message);
    return false;
  }

  // 3. Remove from watchlist
  await removeFromWatchlist(userId, tmdbShowId);
  return true;
}

export async function updateShowProgress(
  userId:          string,
  tmdbShowId:      number,
  updates: {
    status?:           "watching" | "completed" | "dropped";
    episodesWatched?:  number;
    currentSeason?:    number;
    currentEpisode?:   number;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from("show_progress")
    .update({
      ...(updates.status           && { status:           updates.status }),
      ...(updates.episodesWatched  !== undefined && { episodes_watched: updates.episodesWatched }),
      ...(updates.currentSeason    !== undefined && { current_season:   updates.currentSeason }),
      ...(updates.currentEpisode   !== undefined && { current_episode:  updates.currentEpisode }),
    })
    .eq("user_id", userId)
    .eq("tmdb_show_id", tmdbShowId);

  if (error) {
    console.error("[watchlistService] updateShowProgress:", error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchProfileStats(userId: string) {
  const { data, error } = await supabase
    .from("profile_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return { showsCompleted: 0, currentlyWatching: 0, dropped: 0 };

  return {
    showsCompleted:    Number(data.shows_completed),
    currentlyWatching: Number(data.currently_watching),
    dropped:           Number(data.dropped),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAVORITES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFavorites(username: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (!profile) return [];

  const { data, error } = await supabase
    .from("favorite_shows")
    .select("*")
    .eq("user_id", profile.id)
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function upsertFavorite(
  userId: string,
  show: { tmdbShowId: number; title: string; posterPath: string | null; releaseYear: string; position: number }
): Promise<boolean> {
  const { error } = await supabase
    .from("favorite_shows")
    .upsert({
      user_id:      userId,
      tmdb_show_id: show.tmdbShowId,
      title:        show.title,
      poster_path:  show.posterPath,
      release_year: show.releaseYear,
      position:     show.position,
    }, { onConflict: "user_id,position" });

  if (error) {
    console.error("[watchlistService] upsertFavorite:", error.message);
    return false;
  }
  return true;
}
