// ─────────────────────────────────────────────────────────────────────────────
// UserShowsProgress Page  —  /:username/shows
// Progress tracking view: Completed · Watching · Dropped
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useParams, NavLink, Navigate, Link } from "react-router-dom";
import "./UserShowsProgress.css";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ShowStatus = "completed" | "watching" | "dropped";

interface ProgressShowEntry {
  showId: number;
  title: string;
  genres: string;
  posterUrl: string;              // fully-qualified TMDB CDN URL
  status: ShowStatus;
  totalEpisodesWatched: number;
  totalEpisodesInSeries: number;
}

interface ModeConfig {
  key: ShowStatus;
  label: string;
  icon: string;                   // unicode glyph shown on the button
  ariaLabel: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MODE_CONFIG: ModeConfig[] = [
  {
    key:       "completed",
    label:     "Completed",
    icon:      "✓",
    ariaLabel: "Show completed series",
  },
  {
    key:       "watching",
    label:     "Watching",
    icon:      "⏳",
    ariaLabel: "Show currently watching series",
  },
  {
    key:       "dropped",
    label:     "Dropped",
    icon:      "✕",
    ariaLabel: "Show dropped series",
  },
];

// Sub-tab link definitions — mirrors UserProfile.tsx pattern exactly
function buildProfileTabs(username: string) {
  return [
    { label: "Profile",   to: `/${username}` },
    { label: "Shows",     to: `/${username}/shows` },
    { label: "Diary",     to: `/${username}/diary` },
    { label: "Reviews",   to: `/${username}/reviews` },
    { label: "Watchlist", to: `/${username}/watchlist` },
    { label: "Likes",     to: `/${username}/likes` },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// posterUrl uses TMDB w342 CDN directly — swap for getPosterUrl() calls once
// a real data layer provides raw paths.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PROGRESS: ProgressShowEntry[] = [
  // ── Completed ─────────────────────────────────────────────────────────────
  {
    showId:                   1396,
    title:                    "Breaking Bad",
    genres:                   "Drama · Crime · Thriller",
    posterUrl:                "https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    status:                   "completed",
    totalEpisodesWatched:     62,
    totalEpisodesInSeries:    62,
  },
  {
    showId:                   1399,
    title:                    "Game of Thrones",
    genres:                   "Sci-Fi & Fantasy · Drama · Action & Adventure",
    posterUrl:                "https://image.tmdb.org/t/p/w342/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    status:                   "completed",
    totalEpisodesWatched:     73,
    totalEpisodesInSeries:    73,
  },
  {
    showId:                   87108,
    title:                    "Chernobyl",
    genres:                   "Drama · History",
    posterUrl:                "https://image.tmdb.org/t/p/w342/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    status:                   "completed",
    totalEpisodesWatched:     5,
    totalEpisodesInSeries:    5,
  },
  {
    showId:                   2316,
    title:                    "The Office",
    genres:                   "Comedy",
    posterUrl:                "https://image.tmdb.org/t/p/w342/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg",
    status:                   "completed",
    totalEpisodesWatched:     201,
    totalEpisodesInSeries:    201,
  },

  // ── Currently Watching ────────────────────────────────────────────────────
  {
    showId:                   66732,
    title:                    "Stranger Things",
    genres:                   "Drama · Sci-Fi & Fantasy · Mystery",
    posterUrl:                "https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    status:                   "watching",
    totalEpisodesWatched:     30,
    totalEpisodesInSeries:    34,
  },
  {
    showId:                   63333,
    title:                    "The Bear",
    genres:                   "Drama · Comedy",
    posterUrl:                "https://image.tmdb.org/t/p/w342/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    status:                   "watching",
    totalEpisodesWatched:     18,
    totalEpisodesInSeries:    28,
  },
  {
    showId:                   1622,
    title:                    "Suits",
    genres:                   "Drama · Comedy",
    posterUrl:                "https://image.tmdb.org/t/p/w342/vYKK7NMnVQeHLJHG9SVo6IrBXTP.jpg",
    status:                   "watching",
    totalEpisodesWatched:     55,
    totalEpisodesInSeries:    134,
  },

  // ── Dropped ───────────────────────────────────────────────────────────────
  {
    showId:                   1418,
    title:                    "The Big Bang Theory",
    genres:                   "Comedy",
    posterUrl:                "https://image.tmdb.org/t/p/w342/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg",
    status:                   "dropped",
    totalEpisodesWatched:     47,
    totalEpisodesInSeries:    279,
  },
  {
    showId:                   1403,
    title:                    "Agents of S.H.I.E.L.D.",
    genres:                   "Drama · Sci-Fi & Fantasy · Action & Adventure",
    posterUrl:                "https://image.tmdb.org/t/p/w342/bJZFqO9GFbXJyWhC6SfxTiJPMla.jpg",
    status:                   "dropped",
    totalEpisodesWatched:     32,
    totalEpisodesInSeries:    136,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a clamped integer 0–100. */
function calcPercent(watched: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.round((watched / total) * 100), 100);
}

/** Returns the tint class for the percentage badge based on completion level. */
function percentTintClass(pct: number): string {
  if (pct === 100) return "progress-split-card__percent--complete";
  if (pct >= 75)   return "progress-split-card__percent--high";
  if (pct >= 40)   return "progress-split-card__percent--mid";
  return "progress-split-card__percent--low";
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Individual progress card ──────────────────────────────────────────────────

interface ProgressSplitCardProps {
  entry: ProgressShowEntry;
}

function ProgressSplitCard({ entry }: ProgressSplitCardProps): React.ReactElement {
  const pct = calcPercent(entry.totalEpisodesWatched, entry.totalEpisodesInSeries);

  return (
    <Link
      to={`/shows/${entry.showId}`}
      className="progress-split-card"
      aria-label={`${entry.title} — ${pct}% watched`}
    >
      {/* ── Left: 2:3 poster ── */}
      <div className="progress-split-card__poster-col">
        <img
          className="progress-split-card__poster"
          src={entry.posterUrl}
          alt={`${entry.title} poster`}
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* ── Right: metadata panel ── */}
      <div className="progress-split-card__info-col">
        <div className="progress-split-card__text-group">
          <h3 className="progress-split-card__title">{entry.title}</h3>
          <p className="progress-split-card__genres">{entry.genres}</p>
        </div>

        <div className="progress-split-card__footer">
          {/* Episode counter */}
          <span className="progress-split-card__episode-count">
            {entry.totalEpisodesWatched}
            <span className="progress-split-card__episode-sep">/</span>
            {entry.totalEpisodesInSeries}
            <span className="progress-split-card__episode-unit"> ep</span>
          </span>

          {/* Completion percentage badge */}
          <span
            className={[
              "progress-split-card__percent",
              percentTintClass(pct),
            ].join(" ")}
            aria-label={`${pct}% complete`}
          >
            {pct}%
          </span>
        </div>

        {/* Mini progress bar */}
        <div
          className="progress-split-card__bar-track"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${pct}%`}
        >
          <div
            className="progress-split-card__bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ── Empty state for a mode with no entries ────────────────────────────────────

interface EmptyModeStateProps {
  mode: ShowStatus;
}

function EmptyModeState({ mode }: EmptyModeStateProps): React.ReactElement {
  const messages: Record<ShowStatus, { heading: string; sub: string }> = {
    completed: {
      heading: "No completed shows yet",
      sub:     "Finish a series and it will appear here.",
    },
    watching: {
      heading: "Nothing in progress",
      sub:     "Start watching a show from your watchlist.",
    },
    dropped: {
      heading: "No dropped shows",
      sub:     "Shows you abandon mid-way will show up here.",
    },
  };

  const { heading, sub } = messages[mode];

  return (
    <div className="progress-empty-state">
      <p className="progress-empty-state__heading">{heading}</p>
      <p className="progress-empty-state__sub">{sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserShowsProgress(): React.ReactElement {
  const { username } = useParams<{ username: string }>();

  if (!username) return <Navigate to="/home" replace />;

  const [currentMode, setCurrentMode] = useState<ShowStatus>("completed");
  const [entries]                      = useState<ProgressShowEntry[]>(MOCK_PROGRESS);

  const filtered = entries.filter((e) => e.status === currentMode);

  const tabs = buildProfileTabs(username);

  // ── Derived counts for mode badge labels ─────────────────────────────────

  const countFor = (mode: ShowStatus): number =>
    entries.filter((e) => e.status === mode).length;

  return (
    <div className="shows-progress-page">

      {/* ════════════════════════════════════════════
          PROFILE SUB-TAB NAV (shared with UserProfile)
      ════════════════════════════════════════════ */}
      <nav className="profile-tabs" aria-label="Profile sections">
        <ul className="profile-tabs__list" role="list">
          {tabs.map((tab) => (
            <li key={tab.to} className="profile-tabs__item" role="listitem">
              <NavLink
                to={tab.to}
                end
                className={({ isActive }) =>
                  ["profile-tabs__link", isActive ? "profile-tabs__link--active" : ""]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ════════════════════════════════════════════
          PAGE HEADER: title + mode toggle group
      ════════════════════════════════════════════ */}
      <header className="shows-progress-page__header">
        <h1 className="shows-progress-page__heading">Progress</h1>

        {/* Mode toggle button group */}
        <div
          className="shows-progress-page__mode-group"
          role="group"
          aria-label="Filter by watch status"
        >
          {MODE_CONFIG.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={[
                "shows-progress-page__mode-btn",
                currentMode === mode.key
                  ? "shows-progress-page__mode-btn--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setCurrentMode(mode.key)}
              aria-pressed={currentMode === mode.key}
              aria-label={`${mode.ariaLabel} (${countFor(mode.key)})`}
            >
              <span className="shows-progress-page__mode-icon" aria-hidden="true">
                {mode.icon}
              </span>
              <span className="shows-progress-page__mode-label">{mode.label}</span>
              <span className="shows-progress-page__mode-count">
                {countFor(mode.key)}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* ════════════════════════════════════════════
          RESULTS GRID  or  EMPTY STATE
      ════════════════════════════════════════════ */}
      <section
        className="shows-progress-page__results"
        aria-label={`${currentMode} shows`}
        aria-live="polite"
      >
        {filtered.length === 0 ? (
          <EmptyModeState mode={currentMode} />
        ) : (
          <div
            className="progress-media-grid"
            role="list"
            aria-label={`${filtered.length} ${currentMode} show${filtered.length !== 1 ? "s" : ""}`}
          >
            {filtered.map((entry) => (
              <div
                key={`progress-${entry.showId}`}
                className="progress-media-grid__item"
                role="listitem"
              >
                <ProgressSplitCard entry={entry} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}