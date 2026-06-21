// ─────────────────────────────────────────────────────────────────────────────
// TMDB API V3 — TypeScript Interfaces
// Covers TV Shows, Seasons, Episodes, and shared primitives.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared Primitives ────────────────────────────────────────────────────────

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TMDBCreatedBy {
  id: number;
  credit_id: string;
  name: string;
  gender: 0 | 1 | 2 | 3; // 0=Not set, 1=Female, 2=Male, 3=Non-binary
  profile_path: string | null;
}

export type TMDBShowStatus =
  | "Returning Series"
  | "Planned"
  | "In Production"
  | "Ended"
  | "Cancelled"
  | "Pilot";

// ── Episode ──────────────────────────────────────────────────────────────────

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  crew: TMDBCrewMember[];
  guest_stars: TMDBCastMember[];
}

// ── Season ───────────────────────────────────────────────────────────────────

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  vote_average: number;
  episodes?: TMDBEpisode[]; // Only present in full season detail response
}

// ── Cast & Crew ───────────────────────────────────────────────────────────────

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  credit_id: string;
  order: number;
  profile_path: string | null;
  known_for_department: string;
  gender: 0 | 1 | 2 | 3;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  credit_id: string;
  profile_path: string | null;
  gender: 0 | 1 | 2 | 3;
}

export interface TMDBCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

// ── Show: Short (grid / search results) ──────────────────────────────────────

/**
 * Lightweight shape returned by list endpoints:
 * /discover/tv, /search/tv, /trending/tv/*, /tv/popular, etc.
 */
export interface TMDBShowShort {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  first_air_date: string; // "YYYY-MM-DD"
  origin_country: string[];
  original_language: string;
  genre_ids: number[];
  popularity: number;
  adult: boolean;
}

// ── Show: Full Detail (show page) ────────────────────────────────────────────

/**
 * Full shape returned by /tv/{series_id}.
 * Extends TMDBShowShort — every grid field is also present in detail.
 */
export interface TMDBShowDetail extends Omit<TMDBShowShort, "genre_ids"> {
  genres: TMDBGenre[];
  created_by: TMDBCreatedBy[];
  networks: TMDBNetwork[];
  production_companies: TMDBProductionCompany[];
  seasons: TMDBSeason[];
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  status: TMDBShowStatus;
  type: string; // "Scripted" | "Reality" | "Documentary" | …
  tagline: string;
  homepage: string;
  in_production: boolean;
  languages: string[];
  last_air_date: string | null;
  last_episode_to_air: TMDBEpisode | null;
  next_episode_to_air: TMDBEpisode | null;

  // Appended responses (available when ?append_to_response= is used)
  credits?: TMDBCredits;
  similar?: TMDBPaginatedResponse<TMDBShowShort>;
  recommendations?: TMDBPaginatedResponse<TMDBShowShort>;
}

// ── Paginated Response Wrapper ────────────────────────────────────────────────

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// ── Trending — identical shape but typed explicitly for clarity ───────────────

export type TMDBTrendingTimeWindow = "day" | "week";

// ── Search ───────────────────────────────────────────────────────────────────

export interface TMDBSearchParams {
  query: string;
  page?: number;
  include_adult?: boolean;
  language?: string;
  first_air_date_year?: number;
}

// ── Discover ─────────────────────────────────────────────────────────────────

export interface TMDBDiscoverParams {
  page?: number;
  language?: string;
  sort_by?: TMDBSortOption;
  with_genres?: string; // comma- or pipe-separated genre IDs
  first_air_date_year?: number;
  "vote_average.gte"?: number;
  "vote_count.gte"?: number;
  with_networks?: number;
  with_original_language?: string;
}

export type TMDBSortOption =
  | "first_air_date.asc"
  | "first_air_date.desc"
  | "name.asc"
  | "name.desc"
  | "popularity.asc"
  | "popularity.desc"
  | "vote_average.asc"
  | "vote_average.desc";

// ── Person / Actor ─────────────────────────────────────────────────────────────

/**
 * A single TV-show credit on a person's filmography, as returned inside
 * `tv_credits.cast` from the /person/{id} endpoint when `append_to_response`
 * includes `tv_credits`.
 */
export interface TMDBPersonTVCredit {
  id: number;
  name: string;
  poster_path: string | null;
  character: string;
  first_air_date: string;
}

/**
 * /person/{person_id} response shape.
 * `tv_credits` is optional — only populated when append_to_response
 * includes "tv_credits", same convention as TMDBShowDetail.credits.
 */
export interface TMDBPersonDetail {
  id: number;
  name: string;
  biography: string;
  profile_path: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  tv_credits?: {
    cast: TMDBPersonTVCredit[];
  };
}

// ── API Error ────────────────────────────────────────────────────────────────

export interface TMDBApiError {
  status_message: string;
  status_code: number;
  success: false;
}