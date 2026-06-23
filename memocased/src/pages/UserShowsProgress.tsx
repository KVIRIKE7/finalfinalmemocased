// ─────────────────────────────────────────────────────────────────────────────
// UserShowsProgress Page  —  /:username/shows
// Progress tracking view: Completed · Watching · Dropped
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { ProfileShell } from "../components/layout/ProfileShell";
import { useDiary } from "../store/DiaryContext";
import { useWatchlist } from "../store/WatchlistContext";
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

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// posterUrl uses TMDB w342 CDN directly — swap for getPosterUrl() calls once
// a real data layer provides raw paths.
// ─────────────────────────────────────────────────────────────────────────────

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

  const { diaryLogs }         = useDiary();
  const { currentlyWatching } = useWatchlist();

  // Build ProgressShowEntry list from context data
  const entries = useMemo<ProgressShowEntry[]>(() => {
    // Watching — from WatchlistContext
    const watchingEntries: ProgressShowEntry[] = currentlyWatching.map((cw) => ({
      showId:                cw.showId,
      title:                 cw.title,
      genres:                "",
      posterUrl:             cw.posterUrl,
      status:                "watching" as ShowStatus,
      totalEpisodesWatched:  (cw.currentSeason - 1) * 10 + cw.currentEpisode, // best estimate
      totalEpisodesInSeries: 0,
    }));

    // Completed — unique shows from diary logs that have a rating (logged = completed)
    const seenShowIds = new Set<number>();
    const completedEntries: ProgressShowEntry[] = [];
    for (const log of diaryLogs) {
      if (!seenShowIds.has(log.showId)) {
        seenShowIds.add(log.showId);
        completedEntries.push({
          showId:                log.showId,
          title:                 log.title,
          genres:                "",
          posterUrl:             log.posterUrl,
          status:                "completed" as ShowStatus,
          totalEpisodesWatched:  0,
          totalEpisodesInSeries: 0,
        });
      }
    }

    return [...watchingEntries, ...completedEntries];
  }, [diaryLogs, currentlyWatching]);

  const filtered = entries.filter((e) => e.status === currentMode);


  // ── Derived counts for mode badge labels ─────────────────────────────────

  const countFor = (mode: ShowStatus): number =>
    entries.filter((e) => e.status === mode).length;

  return (
    <ProfileShell username={username}>

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
    </ProfileShell>
  );
}