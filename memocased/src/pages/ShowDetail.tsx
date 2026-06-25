// ─────────────────────────────────────────────────────────────────────────────
// ShowDetail Page  —  /shows/:showSlug
// Step 1: live TMDB fetch (no mock data), loading/error states, minimal
// title + poster render. No CSS/layout yet.
//
// SECURITY NOTE — read before changing the fetch logic:
// The original spec for this step asked to embed a TMDB Bearer access
// token directly inside this component's fetch call. That is not done
// here. A token hardcoded into client-side source ships straight to the
// browser in the built JS bundle — anyone can read it from dev tools,
// "view source", or the network tab, which is equivalent to publishing
// the key. This project already has the correct pattern in place:
// `src/services/tmdbApi.ts` reads the key from `import.meta.env`
// (populated from a local, gitignored `.env` file, never committed to
// source) and calls TMDB via the public v3 `api_key` query-param scheme.
// This component calls that existing `getShowDetails()` service function
// instead of duplicating a second, less-safe fetch implementation.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getShowDetails } from "../services/tmdbApi";
import { getPosterUrl } from "../utils/tmdbImage";
import type { TMDBShowDetail } from "../types/tmdb";
import { useAppContext, type TrackedShow } from "../store/AppContext";
import "./ShowDetail.css";

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIVE API DATA STATE INTERFACE
//
// The spec's TmdbShowDetails interface (id, name, overview, first_air_date,
// poster_path) is exactly the shape TMDB's /tv/{id} endpoint returns —
// that's already what TMDBShowDetail (src/types/tmdb.ts) models, fully
// typed, alongside many more fields the real endpoint also sends. Rather
// than declare a second, narrower interface that silently drifts from the
// real type over time, this component uses TMDBShowDetail directly and
// just reads the four fields it needs from it.
// ─────────────────────────────────────────────────────────────────────────────

type TmdbShowDetails = TMDBShowDetail;

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPONENT — capture params, fetch live, hold state
// ─────────────────────────────────────────────────────────────────────────────

export default function ShowDetail(): React.ReactElement {
  const { showSlug } = useParams<{ showSlug: string }>();

  const [showData, setShowData]   = useState<TmdbShowDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ── Step 3 (FEAT-SHOWPAGE-SYNC): Global tracking state via AppContext ────
  // Previously isWatched/inWatchlist/isDropped were local useState flags,
  // scoped to this component instance — navigating away and back (or
  // checking the status from another page) lost the choice entirely.
  // Pulling from the shared AppContext instead means every page reading
  // trackedShows sees the same tracking state, and it survives navigation.
  const { trackedShows, updateShowStatus } = useAppContext();

  // ── Step 4: Metadata tab tracker ──────────────────────────────────────────
  // Same placement rule as the toolstrip hooks above — declared before any
  // conditional return so hook order never depends on loading/error state.
  const [activeTab, setActiveTab] =
    useState<"cast" | "crew" | "details" | "genres">("cast");

  // ── Step 5: Per-season "completed" placeholder state ──────────────────────
  // TMDB has no concept of "have I watched this season" — that's purely
  // local to this app. No real tracking data source exists yet, so this is
  // a local Set of completed season numbers, defaulting to none watched.
  // Swap for real persisted tracking state once that data layer exists.
  const [watchedSeasonNumbers, setWatchedSeasonNumbers] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    // TMDB's /tv/{series_id} endpoint requires a numeric series ID — it
    // has no concept of a text "slug" on this app's side. showSlug from
    // the URL may be either form (a number-as-string from an internal
    // link, or a text slug if one is ever introduced); only the numeric
    // case is resolvable against the live API today; a non-numeric value
    // fails the guard below and falls through to the not-found state.
    const seriesId = Number(showSlug);

    if (!showSlug || Number.isNaN(seriesId)) {
      setShowData(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false; // guards against setting state after unmount

    setIsLoading(true);

    getShowDetails(seriesId, ["credits", "similar"])
      .then((data) => {
        if (!isCancelled) setShowData(data);
      })
      .catch(() => {
        // Network failure or 404 from TMDB — surfaced as "not found" below,
        // not as a thrown error, since the user-facing outcome is the same.
        if (!isCancelled) setShowData(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [showSlug]);

  // ── Season completed toggle ────────────────────────────────────────────────
  // Placeholder local-only tracking — toggling does not persist anywhere
  // yet. Uses a Set so checking many seasons stays cheap and lookups are
  // O(1) rather than scanning an array on every render.
  function handleSeasonWatchedToggle(seasonNumber: number): void {
    setWatchedSeasonNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  }

  // ── 3a. Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return <div>Loading series details...</div>;
  }

  // ── 3b. Error guard rail — fetch finished but no usable data ──────────────
  if (!showData) {
    return (
      <div>
        <p>Show not found at this location</p>
        <Link to="/shows">Back to Browsing</Link>
      </div>
    );
  }

  // ── 4. Minimal render — title + poster only ───────────────────────────────
  const posterUrl = getPosterUrl(showData.poster_path, "w500");

  // ── Step 3 (FEAT-SHOWPAGE-SYNC): Derive toggle state from AppContext ──────
  // currentTracked looks this show up by ID inside the global trackedShows
  // array. showData.id is the real numeric TMDB series ID (not showSlug,
  // which may be the same numeric string from the URL, but showData.id is
  // the authoritative source once the fetch has resolved).
  const currentTracked = trackedShows.find((s) => s.id === showData.id);

  const isWatched   = currentTracked?.status === "watching";
  const inWatchlist = currentTracked?.status === "watchlist";
  const isDropped   = currentTracked?.status === "dropped";

  // The TrackedShow object passed to updateShowStatus on every click —
  // built from the real fetched TMDB fields, per the spec's note.
  const showObject: TrackedShow = {
    id: showData.id,
    name: showData.name,
    poster_path: showData.poster_path ?? "",
    // status here is a placeholder — updateShowStatus's second argument is
    // what actually determines the resulting status; this field is only
    // read by updateShowStatus when appending a brand-new entry, and even
    // then gets overwritten with the resolved status. ESLint/TS just needs
    // the object to satisfy the TrackedShow shape at the call site.
    status: "watching",
  };

  // ── Watching toggle ───────────────────────────────────────────────────────
  // Already watching → clicking again removes tracking entirely.
  // Not watching → clicking sets it to "watching" (global context handles
  // clearing watchlist/dropped on the others' side of this same array).
  function handleWatchedClick(): void {
    updateShowStatus(showObject, isWatched ? "removed" : "watching");
  }

  // ── Watchlist toggle ──────────────────────────────────────────────────────
  function handleWatchlistClick(): void {
    updateShowStatus(showObject, inWatchlist ? "removed" : "watchlist");
  }

  // ── Dropped toggle ────────────────────────────────────────────────────────
  function handleDroppedClick(): void {
    updateShowStatus(showObject, isDropped ? "removed" : "dropped");
  }

  // ── Step 3: Extract release year from "YYYY-MM-DD" ────────────────────────
  // first_air_date is typed as a non-optional string on TMDBShowDetail, but
  // TMDB's real API can still return an empty string for shows with no
  // confirmed air date — so this guards against both an empty string and a
  // malformed value, rather than trusting the leading 4 characters blindly.
  const releaseYear: string =
    showData.first_air_date && showData.first_air_date.length >= 4
      ? showData.first_air_date.slice(0, 4)
      : "Unknown";

  // ── Step 4: Derived credits/details data for the tab panels ──────────────

  // Cast — top 12 by TMDB's own billing order, credits is optional on the
  // type since it's only populated when append_to_response includes it.
  const topCast = showData.credits?.cast.slice(0, 12) ?? [];

  // Crew — TMDB returns dozens of crew entries per show (camera operators,
  // editors, etc.). Filter down to the roles actually worth surfacing, then
  // group same-job people together so "Writers" lists everyone once rather
  // than one row per person.
  const KEY_CREW_JOBS = ["Director", "Executive Producer", "Writer", "Creator"];

  const crewByJob: { job: string; names: string[] }[] = KEY_CREW_JOBS.map((job) => ({
    job,
    names: (showData.credits?.crew ?? [])
      .filter((member) => member.job === job)
      .map((member) => member.name),
  })).filter((group) => group.names.length > 0); // drop roles with no one credited

  // Details — networks, countries, languages straight off the main payload,
  // no credits needed for this tab.
  const detailGroups: { label: string; values: string[] }[] = [
    { label: "NETWORKS",  values: showData.networks.map((n) => n.name) },
    { label: "COUNTRIES", values: showData.origin_country },
    { label: "LANGUAGES", values: showData.languages },
  ].filter((group) => group.values.length > 0);

  // ── Step 5: Derived similar-shows data for the recommendations shelf ─────
  // similar is optional on the type — only populated when append_to_response
  // includes "similar". Cap at 6 for the horizontal shelf per spec.
  const similarShows = showData.similar?.results.slice(0, 6) ?? [];

  return (
    <>
      <div className="show-detail-container">

        {/* ════════════════════════════════════════════
            Immersive blurred backdrop layer
        ════════════════════════════════════════════ */}
        <div className="show-detail-backdrop">
          <div
            className="show-detail-backdrop__image"
            style={
              showData.backdrop_path
                ? {
                    backgroundImage: `url(https://image.tmdb.org/t/p/original${showData.backdrop_path})`,
                  }
                : undefined
            }
          />
        </div>

        {/* ════════════════════════════════════════════
            Two-column core grid — sits visually on top of the backdrop
        ════════════════════════════════════════════ */}
        <div className="show-main-content">

          {/* ════════════════════════════════════════════
              LEFT COLUMN — poster artwork only, nothing else
          ════════════════════════════════════════════ */}
      <div className="show-detail-poster-column">
        {posterUrl && <img src={posterUrl} alt={`${showData.name} poster`} />}
      </div>

      {/* ════════════════════════════════════════════
          RIGHT COLUMN — header, toolstrip, synopsis
      ════════════════════════════════════════════ */}
      <div className="show-detail-info-column">

        {/* ── Header group: title + release year inline ── */}
        <div className="show-detail-header-group">
          <h1>{showData.name}</h1>
          <span>{releaseYear}</span>
        </div>

        {/* ── Step 2: Tracking toolstrip — three interlocking toggles ── */}
        <div className="action-toolstrip">
          <button
            type="button"
            className={`toolstrip-btn toolstrip-btn--watch${isWatched ? " is-active" : ""}`}
            onClick={handleWatchedClick}
            aria-pressed={isWatched}
          >
            {isWatched ? "✓ Watching" : "Watch"}
          </button>

          <button
            type="button"
            className={`toolstrip-btn toolstrip-btn--watchlist${inWatchlist ? " is-active" : ""}`}
            onClick={handleWatchlistClick}
            aria-pressed={inWatchlist}
          >
            {inWatchlist ? "✓ In Watchlist" : "Watchlist"}
          </button>

          <button
            type="button"
            className={`toolstrip-btn toolstrip-btn--dropped${isDropped ? " is-active" : ""}`}
            onClick={handleDroppedClick}
            aria-pressed={isDropped}
          >
            {isDropped ? "✓ Dropped" : "Drop"}
          </button>
        </div>

        {/* ── Synopsis ── */}
        <p className="show-detail-synopsis">{showData.overview}</p>

        {/* ════════════════════════════════════════════
            Step 4: Metadata tab sub-navigation
        ════════════════════════════════════════════ */}
        <div className="metadata-tabs-nav">
          <button
            type="button"
            className={`tab-nav-btn${activeTab === "cast" ? " is-active" : ""}`}
            onClick={() => setActiveTab("cast")}
          >
            Cast
          </button>
          <button
            type="button"
            className={`tab-nav-btn${activeTab === "crew" ? " is-active" : ""}`}
            onClick={() => setActiveTab("crew")}
          >
            Crew
          </button>
          <button
            type="button"
            className={`tab-nav-btn${activeTab === "details" ? " is-active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
          <button
            type="button"
            className={`tab-nav-btn${activeTab === "genres" ? " is-active" : ""}`}
            onClick={() => setActiveTab("genres")}
          >
            Genres
          </button>
        </div>

        {/* ── Cast panel ── */}
        {activeTab === "cast" && (
          <div className="tab-panel tab-panel--cast">
            {topCast.length === 0 ? (
              <p>No cast information available.</p>
            ) : (
              topCast.map((member) => (
                <Link
                  key={member.id}
                  to={`/actors/${member.id}`}
                  className="cast-pill"
                >
                  {member.name}
                </Link>
              ))
            )}
          </div>
        )}

        {/* ── Crew panel ── */}
        {activeTab === "crew" && (
          <div className="tab-panel tab-panel--crew">
            {crewByJob.length === 0 ? (
              <p>No crew information available.</p>
            ) : (
              crewByJob.map((group) => (
                <div key={group.job}>
                  <h3>{group.job.toUpperCase()}</h3>
                  <p>{group.names.join(", ")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Details panel ── */}
        {activeTab === "details" && (
          <div className="tab-panel tab-panel--details">
            {detailGroups.length === 0 ? (
              <p>No details available.</p>
            ) : (
              detailGroups.map((group) => (
                <div key={group.label}>
                  <h3>{group.label}</h3>
                  <p>{group.values.join(", ")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Genres panel ── */}
        {activeTab === "genres" && (
          <div className="tab-panel tab-panel--genres">
            {showData.genres.length === 0 ? (
              <p>No genres available.</p>
            ) : (
              showData.genres.map((genre) => (
                <Link
                  className="genre-pill"
                  key={genre.id}
                  to={`/shows?genre=${genre.name.toLowerCase()}`}
                >
                  {genre.name}
                </Link>
              ))
            )}
          </div>
        )}

      </div>
        </div>
    </div>

    {/* ════════════════════════════════════════════
        Step 5: Live sequential seasons directory
    ════════════════════════════════════════════ */}
    <div className="show-seasons-block">

      <h2 className="show-seasons-block__title">
        Seasons ({showData.seasons.length})
      </h2>

      {showData.seasons.map((season) => {
        const seasonPosterUrl = season.poster_path
          ? `https://image.tmdb.org/t/p/w200${season.poster_path}`
          : null;

        const seasonYear =
          season.air_date && season.air_date.length >= 4
            ? season.air_date.slice(0, 4)
            : "TBA";

        const isSeasonWatched = watchedSeasonNumbers.has(season.season_number);

        return (
          <Link
            key={season.season_number}
            to={`/shows/${showSlug}/season/${season.season_number}`}
            className="season-row-card"
          >
            {/* ── Left segment: thumbnail + text stack, grouped ── */}
            <div className="season-row-card__left">
              {seasonPosterUrl && (
                <img
                  className="season-row-card__poster"
                  src={seasonPosterUrl}
                  alt={`Season ${season.season_number} poster`}
                />
              )}

              <div className="season-row-card__text">
                <p className="season-row-card__title">
                  Season {season.season_number}
                </p>
                <p className="season-row-card__meta">
                  {seasonYear} · {season.episode_count} episodes
                </p>
              </div>
            </div>

            {/* ── Right: completed check-state placeholder ── */}
            <div className="season-row-card__check">
              <input
                type="checkbox"
                checked={isSeasonWatched}
                onChange={(e) => {
                  e.stopPropagation(); // don't trigger the surrounding Link navigation
                  handleSeasonWatchedToggle(season.season_number);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={
                  isSeasonWatched
                    ? `Season ${season.season_number} marked watched`
                    : `Mark season ${season.season_number} as watched`
                }
              />
            </div>
          </Link>
        );
      })}

    </div>

    {/* ════════════════════════════════════════════
        Step 5: Live horizontal recommendations shelf
    ════════════════════════════════════════════ */}
    <div className="similar-shows-shelf">

      <h2 className="similar-shows-shelf__title">SIMILAR SHOWS</h2>

      <div className="similar-shows-shelf__rail">
        {similarShows.map((similarItem) => {
          const similarPosterUrl = similarItem.poster_path
            ? `https://image.tmdb.org/t/p/w300${similarItem.poster_path}`
            : null;

          return (
            <Link
              key={similarItem.id}
              to={`/shows/${similarItem.id}`}
              className="similar-shows-shelf__card"
            >
              {/* Poster only — no title, no rating, no secondary text */}
              {similarPosterUrl && (
                <img src={similarPosterUrl} alt={`${similarItem.name} poster`} />
              )}
            </Link>
          );
        })}
      </div>

    </div>
    </>
  );
}