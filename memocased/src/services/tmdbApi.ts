// ─────────────────────────────────────────────────────────────────────────────
// TMDB API Client
// Fetch-based, fully typed, zero `any`. Ready for custom hook consumption.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TMDBShowShort,
  TMDBShowDetail,
  TMDBSeason,
  TMDBPaginatedResponse,
  TMDBSearchParams,
  TMDBDiscoverParams,
  TMDBTrendingTimeWindow,
  TMDBPersonDetail,
  TMDBApiError,
} from "../types/tmdb";

// ── Environment ───────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string;
const BASE_URL = import.meta.env.VITE_TMDB_BASE_URL as string;

if (!API_KEY) {
  throw new Error("[Memocased] VITE_TMDB_API_KEY is not set in .env");
}
if (!BASE_URL) {
  throw new Error("[Memocased] VITE_TMDB_BASE_URL is not set in .env");
}

// ── Request Config ────────────────────────────────────────────────────────────

const DEFAULT_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// ── Query String Builder ──────────────────────────────────────────────────────

type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

function buildQueryString(params: QueryParams): string {
  const search = new URLSearchParams();

  // Auth — TMDB supports both `api_key` (v3) and Bearer tokens (v4).
  // We use api_key here to stay on the public v3 surface.
  search.set("api_key", API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }

  return search.toString();
}

// ── Core Fetch Wrapper ────────────────────────────────────────────────────────

/**
 * Generic typed fetch wrapper.
 * Throws a structured TMDBApiError on non-OK responses.
 */
async function tmdbFetch<TData>(
  endpoint: string,
  params: QueryParams = {}
): Promise<TData> {
  const url = `${BASE_URL}${endpoint}?${buildQueryString(params)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });

  if (!response.ok) {
    // TMDB returns structured error JSON on 4xx/5xx
    const errorBody = (await response.json().catch(() => ({
      status_message: "Unknown error",
      status_code: response.status,
      success: false,
    }))) as TMDBApiError;

    throw new TMDBError(errorBody.status_message, errorBody.status_code);
  }

  return response.json() as Promise<TData>;
}

// ── Custom Error Class ────────────────────────────────────────────────────────

export class TMDBError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "TMDBError";
    this.statusCode = statusCode;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE FUNCTIONS
// Each function is a single-responsibility unit — import only what you need.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shows: Lists ─────────────────────────────────────────────────────────────

/**
 * Fetch the current list of popular TV shows.
 * Endpoint: GET /tv/popular
 */
export async function getPopularShows(
  page = 1,
  language = "en-US"
): Promise<TMDBPaginatedResponse<TMDBShowShort>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShowShort>>("/tv/popular", {
    page,
    language,
  });
}

/**
 * Fetch the top-rated TV shows.
 * Endpoint: GET /tv/top_rated
 */
export async function getTopRatedShows(
  page = 1,
  language = "en-US"
): Promise<TMDBPaginatedResponse<TMDBShowShort>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShowShort>>("/tv/top_rated", {
    page,
    language,
  });
}

/**
 * Fetch TV shows currently airing today.
 * Endpoint: GET /tv/airing_today
 */
export async function getAiringTodayShows(
  page = 1,
  language = "en-US"
): Promise<TMDBPaginatedResponse<TMDBShowShort>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShowShort>>("/tv/airing_today", {
    page,
    language,
  });
}

/**
 * Fetch TV shows currently on the air (airing within the next 7 days).
 * Endpoint: GET /tv/on_the_air
 */
export async function getOnTheAirShows(
  page = 1,
  language = "en-US"
): Promise<TMDBPaginatedResponse<TMDBShowShort>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShowShort>>("/tv/on_the_air", {
    page,
    language,
  });
}

// ── Shows: Trending ───────────────────────────────────────────────────────────

/**
 * Fetch trending TV shows for a given time window.
 * Endpoint: GET /trending/tv/{time_window}
 */
export async function getTrendingShows(
  timeWindow: TMDBTrendingTimeWindow = "week",
  language = "en-US"
): Promise<TMDBPaginatedResponse<TMDBShowShort>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShowShort>>(
    `/trending/tv/${timeWindow}`,
    { language }
  );
}

// ── Shows: Detail ─────────────────────────────────────────────────────────────

/**
 * Fetch full details for a single TV show.
 * Optionally append related data (credits, similar, recommendations)
 * in a single network round-trip via TMDB's `append_to_response`.
 *
 * Endpoint: GET /tv/{series_id}
 */
export type AppendToResponse = "credits" | "similar" | "recommendations";

export async function getShowDetails(
  seriesId: number,
  appendToResponse: AppendToResponse[] = [],
  language = "en-US"
): Promise<TMDBShowDetail> {
  const params: QueryParams = { language };

  if (appendToResponse.length > 0) {
    params["append_to_response"] = appendToResponse.join(",");
  }

  return tmdbFetch<TMDBShowDetail>(`/tv/${seriesId}`, params);
}

// ── Shows: Season ─────────────────────────────────────────────────────────────

/**
 * Fetch details for a specific season of a TV show (includes episode list).
 * Endpoint: GET /tv/{series_id}/season/{season_number}
 */
export async function getSeasonDetails(
  seriesId: number,
  seasonNumber: number,
  language = "en-US"
): Promise<TMDBSeason> {
  return tmdbFetch<TMDBSeason>(
    `/tv/${seriesId}/season/${seasonNumber}`,
    { language }
  );
}

// ── People: Person Details ──────────────────────────────────────────────────────

/**
 * Fetch a person's profile (biography, headshot, birthday, etc.).
 * Optionally append related data — here just `tv_credits`, the person
 * endpoint's equivalent of the show endpoint's `append_to_response=credits`.
 *
 * Endpoint: GET /person/{person_id}
 */
export type PersonAppendToResponse = "tv_credits" | "movie_credits" | "combined_credits";

export async function getPersonDetails(
  personId: number,
  appendToResponse: PersonAppendToResponse[] = [],
  language = "en-US"
): Promise<TMDBPersonDetail> {
  const params: QueryParams = { language };

  if (appendToResponse.length > 0) {
    params["append_to_response"] = appendToResponse.join(",");
  }

  return tmdbFetch<TMDBPersonDetail>(`/person/${personId}`, params);
}

// ── Shows: Search ─────────────────────────────────────────────────────────────

/**
 * Search for TV shows by name.
 * Endpoint: GET /search/tv
 */
export async function searchShows(
  params: TMDBSearchParams
): Promise<TMDBPaginatedResponse<TMDBShowShort>> {
  const { query, page = 1, include_adult = false, language = "en-US", first_air_date_year } =
    params;

  return tmdbFetch<TMDBPaginatedResponse<TMDBShowShort>>("/search/tv", {
    query,
    page,
    include_adult,
    language,
    first_air_date_year,
  });
}

// ── Shows: Discover ───────────────────────────────────────────────────────────

/**
 * Discover TV shows using filters (genre, year, rating, etc.).
 * Endpoint: GET /discover/tv
 */
export async function discoverShows(
  params: TMDBDiscoverParams = {}
): Promise<TMDBPaginatedResponse<TMDBShowShort>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShowShort>>("/discover/tv", {
    language: "en-US",
    ...params,
  });
}