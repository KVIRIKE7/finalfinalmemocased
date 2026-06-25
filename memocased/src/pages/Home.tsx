// ─────────────────────────────────────────────────────────────────────────────
// Home Page  —  /home
// Dashboard: "Continue Watching" + "Start Watching" + Activity Streak Banner.
// All state lives here. recordActivity() is the single write point for the log.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { useDiary } from "../store/DiaryContext";
import { useAppContext, type TrackedShow } from "../store/AppContext";
import { getPosterUrl } from "../utils/tmdbImage";
import { LogModal } from "../components/LogModal";
import type { AutomatedLogData, LogEntry } from "../types/navbar";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
//
// FEAT-HOME-DYNAMIC: ActiveShowProgress and WatchlistItem (and their mock
// INITIAL_PROGRESS / INITIAL_WATCHLIST arrays) previously modeled the two
// dashboard rows independently of the rest of the app. Both are removed —
// both rows now derive directly from the global AppContext.trackedShows
// array, via the `status` field, so a show tracked from ShowDetail.tsx (or
// anywhere else that calls updateShowStatus) appears here with zero extra
// wiring, and disappears here the moment its status changes elsewhere.
//
// KNOWN LIMITATION: TrackedShow (id, name, poster_path, status) carries no
// episode/season progress data — AppContext was never extended with fields
// like currentSeason/currentEpisode/episodesInCurrentSeason. The previous
// mock-data version of "Continue Watching" rendered a progress bar and an
// "S{n}•E{n}" pointer; that data simply doesn't exist in global state today,
// so rather than fabricate fake numbers, the Continue Watching card below
// renders poster + title only, with no progress indicator. Restoring that
// UI correctly requires extending AppContext (or fetching live per-show
// progress from a real backend) — flagged here, not silently faked.

// Each log entry records *what* was watched and *when*.
// The streak is computed purely from these entries — no login signals.
interface ActivityEntry {
  date: string;    // "YYYY-MM-DD" local date
  showId: number;
  season: number;
  episode: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// All date work uses local time so "today" matches the user's wall clock.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in local time. */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns the ISO date string for a day relative to today.
 * offsetDays = 0 → today, -1 → yesterday, -6 → 6 days ago, etc.
 */
function relativeISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Short weekday label for a "YYYY-MM-DD" string — e.g. "Mon", "Tue". */
function weekdayLabel(isoDate: string): string {
  // Append T00:00:00 to force local-time parsing (plain YYYY-MM-DD is UTC in JS)
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Computes the current consecutive-day streak from a set of active dates.
 * A streak is an unbroken chain ending on today or yesterday.
 * A gap of 2+ days between any two consecutive active dates breaks the chain.
 */
function computeStreak(activeDates: Set<string>): number {
  if (activeDates.size === 0) return 0;

  const today = todayISO();
  const yesterday = relativeISO(-1);

  // Streak must touch today or yesterday; otherwise it's already broken.
  if (!activeDates.has(today) && !activeDates.has(yesterday)) return 0;

  // Walk backwards from today until we hit a gap.
  let streak = 0;
  let offset = activeDates.has(today) ? 0 : -1;

  while (activeDates.has(relativeISO(offset))) {
    streak++;
    offset--;
  }

  return streak;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// FEAT-HOME-DYNAMIC: the static INITIAL_PROGRESS / INITIAL_WATCHLIST arrays
// that used to seed these two rows are gone — both rows now derive from
// AppContext.trackedShows (see the Home() component below). Only the
// activity-log seed remains, since the streak banner is a separate,
// genuinely local-only feature not covered by trackedShows.
// ─────────────────────────────────────────────────────────────────────────────

// Pre-seed the log with a 3-day streak ending yesterday so the banner
// shows something meaningful on first load. Remove for production.
const INITIAL_ACTIVITY: ActivityEntry[] = [
  { date: relativeISO(-2), showId: 1396, season: 4, episode: 6 },
  { date: relativeISO(-1), showId: 1399, season: 6, episode: 7 },
  { date: relativeISO(-1), showId: 66732, season: 3, episode: 4 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: CHECKMARK ICON SVG
// ─────────────────────────────────────────────────────────────────────────────

function CheckIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="check-icon"
    >
      <polyline
        points="2.5,8.5 6.5,12.5 13.5,4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUE WATCHING — CARD
// ─────────────────────────────────────────────────────────────────────────────

interface ContinueWatchingCardProps {
  show: TrackedShow;
  onMarkWatched: (showId: number) => void;
}

function ContinueWatchingCard({
  show,
  onMarkWatched,
}: ContinueWatchingCardProps): React.ReactElement {
  const { id, name, poster_path } = show;
  // Built directly per spec: https://image.tmdb.org/t/p/w300${show.poster_path}
  // poster_path can be an empty string on a freshly-tracked show with no
  // artwork yet — guarded so a broken `…/w300` (no path segment) never
  // reaches the <img> src.
  const imageUrl = poster_path
    ? `https://image.tmdb.org/t/p/w300${poster_path}`
    : null;

  return (
    <article className="cw-card" aria-label={name}>
      <div className="cw-card__image-wrapper">
        {/* FEAT-CLICKABLE-POSTERS: the artwork itself now navigates to the
            show's detail page — previously only the checkmark button was
            interactive, so clicking anywhere else on the card did nothing. */}
        <Link to={`/shows/${id}`} className="cw-card__image-link">
          {imageUrl && (
            <img
              className="cw-card__image"
              src={imageUrl}
              alt={`${name} artwork`}
              loading="lazy"
              draggable={false}
            />
          )}
        </Link>

        {/*
          KNOWN LIMITATION (see FEAT-HOME-DYNAMIC note at top of file):
          TrackedShow carries no episode/season progress, so the progress
          bar and "S{n}•E{n}" pointer that used to render here are gone —
          there is currently no global data source for them. Re-introduce
          once AppContext (or a real backend) tracks per-show progress.
        */}

        <button
          className="cw-card__check-button"
          onClick={() => onMarkWatched(id)}
          aria-label={`Mark an episode of ${name} as watched`}
          title="Mark episode as watched"
        >
          <CheckIcon />
        </button>
      </div>
      <div className="cw-card__meta">
        <Link to={`/shows/${id}`} className="cw-card__title-link">
          <p className="cw-card__title">{name}</p>
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUE WATCHING — SECTION
// ─────────────────────────────────────────────────────────────────────────────

interface ContinueWatchingSectionProps {
  username: string;
  shows: TrackedShow[];
  onMarkWatched: (showId: number) => void;
}

function ContinueWatchingSection({
  username,
  shows,
  onMarkWatched,
}: ContinueWatchingSectionProps): React.ReactElement {
  const navigate = useNavigate();

  // FEAT-NAV-EMPTY-CURRENT: previously this whole section, including the
  // heading + navigation Link to /:username/shows/currentlywatching,
  // returned null when the list was empty — leaving a user with nothing
  // currently watching with no way to even reach that page from Home.
  // Now the header (and its Link) always renders; only the scrollable
  // card row swaps for an actionable empty-state button.
  return (
    <section className="cw-section" aria-labelledby="cw-section-heading">
      <div className="cw-section__header">
        <Link
          to={`/${username}/shows/currentlywatching`}
          className="cw-section__heading-link"
          aria-label="View all currently watching shows"
        >
          <h2 className="cw-section__heading" id="cw-section-heading">Continue Watching</h2>
          <span className="cw-section__heading-arrow" aria-hidden="true">›</span>
        </Link>
      </div>

      {shows.length === 0 ? (
        <div className="cw-section__empty">
          <p className="cw-section__empty-text">
            Nothing in progress yet.
          </p>
          <button
            type="button"
            className="cw-section__empty-button"
            onClick={() => navigate("/shows")}
          >
            Go find shows
          </button>
        </div>
      ) : (
        <div className="cw-section__scroll-container" role="list" aria-label="Shows in progress">
          {shows.map((show) => (
            <div key={`cw-${show.id}`} className="cw-section__card-slot" role="listitem">
              <ContinueWatchingCard show={show} onMarkWatched={onMarkWatched} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START WATCHING — CARD
// ─────────────────────────────────────────────────────────────────────────────

interface StartWatchingCardProps {
  item: TrackedShow;
  onPromote: (showId: number) => void;
}

function StartWatchingCard({ item, onPromote }: StartWatchingCardProps): React.ReactElement {
  const { id, name } = item;
  const imageUrl = getPosterUrl(item.poster_path, "w342");

  return (
    <article className="sw-card" aria-label={`${name} — watchlist`}>
      <div className="sw-card__poster-wrapper">
        {/* FEAT-CLICKABLE-POSTERS: poster now links to the show detail page. */}
        <Link to={`/shows/${id}`} className="sw-card__poster-link">
          {imageUrl && (
            <img
              className="sw-card__poster-image"
              src={imageUrl}
              alt={`${name} poster`}
              loading="lazy"
              draggable={false}
            />
          )}
        </Link>
        <button
          className="sw-card__check-button"
          onClick={() => onPromote(id)}
          aria-label={`Start watching ${name}`}
          title="Start watching"
        >
          <CheckIcon />
        </button>
      </div>
      <div className="sw-card__meta">
        <Link to={`/shows/${id}`} className="sw-card__title-link">
          <p className="sw-card__title">{name}</p>
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START WATCHING — SECTION
// ─────────────────────────────────────────────────────────────────────────────

interface StartWatchingSectionProps {
  username: string;
  items: TrackedShow[];
  onPromote: (showId: number) => void;
}

function StartWatchingSection({
  username,
  items,
  onPromote,
}: StartWatchingSectionProps): React.ReactElement {
  const navigate = useNavigate();

  // FEAT-NAV-EMPTY-WATCH: same fix as Continue Watching — the heading and
  // its navigation Link to /:username/watchlist must always render, even
  // with zero items, so a user with an empty watchlist can still reach
  // the full watchlist page from Home.
  return (
    <section className="sw-section" aria-labelledby="sw-section-heading">
      <div className="sw-section__header">
        <Link
          to={`/${username}/watchlist`}
          className="sw-section__heading-link"
          aria-label="View full watchlist"
        >
          <h2 className="sw-section__heading" id="sw-section-heading">Start Watching</h2>
          <span className="sw-section__heading-arrow" aria-hidden="true">›</span>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="sw-section__empty">
          <p className="sw-section__empty-text">
            Your watchlist is empty.
          </p>
          <button
            type="button"
            className="sw-section__empty-button"
            onClick={() => navigate(`/${username}/watchlist`)}
          >
            Go to your watchlist
          </button>
        </div>
      ) : (
        <div className="sw-section__scroll-container" role="list" aria-label="Watchlist">
          {items.map((item) => (
            <div key={`sw-${item.id}`} className="sw-section__card-slot" role="listitem">
              <StartWatchingCard item={item} onPromote={onPromote} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK BANNER
// ─────────────────────────────────────────────────────────────────────────────

// The 7 calendar slots shown in the banner, built at render time.
interface CalendarSlot {
  isoDate: string;    // "YYYY-MM-DD"
  label: string;      // "Mon", "Tue", etc.
  isToday: boolean;
}

interface StreakBannerProps {
  currentStreak: number;
  activeDates: Set<string>;
}

function StreakBanner({ currentStreak, activeDates }: StreakBannerProps): React.ReactElement {
  // Build the last-7-days slot array at render time (stable across re-renders
  // within the same day — no useMemo needed since todayISO() is pure).
  const today = todayISO();

  const slots: CalendarSlot[] = Array.from({ length: 7 }, (_, i) => {
    const isoDate = relativeISO(-(6 - i)); // index 0 = 6 days ago, index 6 = today
    return {
      isoDate,
      label: weekdayLabel(isoDate),
      isToday: isoDate === today,
    };
  });

  const streakLabel =
    currentStreak === 0
      ? "No streak yet"
      : `${currentStreak}-day streak`;

  return (
    <aside className="streak-banner" aria-label="Activity streak tracker">
      {/* ── Left: flame + streak count ── */}
      <div className="streak-banner__left">
        <span className="streak-banner__flame" aria-hidden="true" role="img">
          🔥
        </span>
        <div className="streak-banner__text-group">
          <span className="streak-banner__count" aria-live="polite">
            {streakLabel}
          </span>
          <span className="streak-banner__sub">
            Based on episode activity
          </span>
        </div>
      </div>

      {/* ── Right: 7-day calendar dots ── */}
      <div
        className="streak-banner__calendar"
        role="list"
        aria-label="Last 7 days of activity"
      >
        {slots.map((slot) => {
          const isActive = activeDates.has(slot.isoDate);

          return (
            <div
              key={slot.isoDate}
              className="streak-banner__day-slot"
              role="listitem"
            >
              {/* Day label above the dot */}
              <span
                className={[
                  "streak-banner__day-label",
                  slot.isToday ? "streak-banner__day-label--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              >
                {slot.label}
              </span>

              {/* The indicator dot / block */}
              <div
                className={[
                  "streak-banner__day-dot",
                  isActive
                    ? "streak-banner__day-dot--active"
                    : "streak-banner__day-dot--inactive",
                  slot.isToday ? "streak-banner__day-dot--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  isActive
                    ? `${slot.label} — watched`
                    : `${slot.label} — no activity`
                }
                title={slot.isoDate}
              />
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Home(): React.ReactElement {
  const { user } = useUser();
  const { addLogEntry } = useDiary();
  const { trackedShows, updateShowStatus } = useAppContext();
  const username = user?.username ?? "profile";

  // FEAT-HOME-DYNAMIC: both rows now derive straight from the global
  // trackedShows array via the `status` field — no local progress/watchlist
  // state, no mock seed data. A show tracked as "watching" anywhere in the
  // app (e.g. ShowDetail's toolstrip) appears in Continue Watching here
  // immediately; a show tracked as "watchlist" appears in Start Watching.
  const currentlyWatching = useMemo(
    () => trackedShows.filter((s) => s.status === "watching"),
    [trackedShows]
  );

  const watchlistShows = useMemo(
    () => trackedShows.filter((s) => s.status === "watchlist"),
    [trackedShows]
  );

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(INITIAL_ACTIVITY);

  // ── Modal state ───────────────────────────────────────────────────────────
  // isLogModalOpen: controls overlay visibility.
  // automatedLogInjection: when non-null, LogModal skips search and
  // pre-fills DetailsPanel with the completed season's data.

  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [automatedLogInjection, setAutomatedLogInjection] =
    useState<AutomatedLogData | null>(null);

  // ── Derived: unique active dates + streak (recomputed only when log changes) ──

  const activeDates = useMemo<Set<string>>(
    () => new Set(activityLog.map((e) => e.date)),
    [activityLog]
  );

  const currentStreak = useMemo<number>(
    () => computeStreak(activeDates),
    [activeDates]
  );

  // ── Single write point for the activity log ──────────────────────────────
  // Called by both action handlers. Appends today's date only once per day
  // per show (idempotent within a session — duplicate entries don't break
  // the streak, but we avoid unnecessary array growth).

  const recordActivity = useCallback(
    (showId: number, season: number, episode: number): void => {
      const date = todayISO();
      setActivityLog((prev) => [
        ...prev,
        { date, showId, season, episode },
      ]);
    },
    []
  );

  // ── Modal close — clears injection so re-opening starts fresh ────────────

  const handleCloseModal = useCallback((): void => {
    setIsLogModalOpen(false);
    setAutomatedLogInjection(null);
  }, []);

  // ── Modal save — records the log entry then closes cleanly ───────────────

  const handleLogSave = useCallback((entry: LogEntry): void => {
    // Writes into the shared diaryLogs source of truth (DiaryContext) —
    // season-finale logs now appear on the diary timeline immediately,
    // same as manual + LOG saves from the Navbar.
    addLogEntry(entry);
    // Record the saved log as activity so the streak banner updates
    recordActivity(entry.showId, entry.season, 0);
    setIsLogModalOpen(false);
    setAutomatedLogInjection(null);
  }, [addLogEntry, recordActivity]);

  // ── Continue Watching: checkmark click ────────────────────────────────────
  //
  // FEAT-HOME-DYNAMIC — KNOWN LIMITATION:
  // The previous version of this handler incremented currentEpisode against
  // episodesInCurrentSeason/totalSeasons, with three branches (normal
  // increment, season finale, series finale) driving an automated log-entry
  // modal. None of that season/episode data exists on TrackedShow — global
  // state has no field for it. Replicating the old three-path logic here is
  // not possible without fabricating numbers AppContext doesn't track.
  //
  // What this now does instead, honestly within the data that's available:
  // clicking the checkmark marks the show as finished — it's removed from
  // Continue Watching (status → "removed") and opens the log modal so the
  // user can record what they watched, with the activity recorded for the
  // streak banner. Restoring real per-episode increments requires extending
  // AppContext with progress fields (or fetching live progress from a real
  // backend), which is out of scope for this fix.

  const handleMarkWatched = useCallback(
    (showId: number): void => {
      const show = trackedShows.find((s) => s.id === showId);
      if (!show) return;

      recordActivity(showId, 0, 0);

      setAutomatedLogInjection({
        showId:      show.id,
        title:       show.name,
        posterUrl:   getPosterUrl(show.poster_path, "w342") ?? "",
        seasonToLog: 1,
      });
      setIsLogModalOpen(true);

      updateShowStatus(show, "removed");
    },
    [trackedShows, updateShowStatus, recordActivity]
  );

  // ── Start Watching: promote watchlist item → currently watching ──────────
  //
  // FEAT-HOME-DYNAMIC: this used to be a multi-step local-state dance
  // (read watchlistRef, build a fabricated ActiveShowProgress object with
  // currentSeason: 1 / currentEpisode: 1, push into a separate `progress`
  // array, filter out of a separate `watchlist` array, all coordinated to
  // avoid a React 18 Strict Mode double-invoke bug). None of that
  // coordination is needed anymore — promoting a show is just a status
  // change, and AppContext's updateShowStatus already replaces a show's
  // status atomically in one array, so there's no second array to keep in
  // sync and no duplicate-invocation risk to guard against.

  const handlePromote = useCallback(
    (showId: number): void => {
      const item = watchlistShows.find((w) => w.id === showId);
      if (!item) return;

      updateShowStatus(item, "watching");
      recordActivity(item.id, 1, 1);
    },
    [watchlistShows, updateShowStatus, recordActivity]
  );

  return (
    <div className="home-page">
      <ContinueWatchingSection
        username={username}
        shows={currentlyWatching}
        onMarkWatched={handleMarkWatched}
      />

      <StartWatchingSection
        username={username}
        items={watchlistShows}
        onPromote={handlePromote}
      />

      <StreakBanner
        currentStreak={currentStreak}
        activeDates={activeDates}
      />

      {/* Log modal — mounts on both manual (+ LOG button) and automated
          (season finale checkmark) triggers. automatedLogInjection being
          non-null causes LogModal to skip Phase 1 and pre-fill Phase 2. */}
      {isLogModalOpen && (
        <LogModal
          onClose={handleCloseModal}
          onSave={handleLogSave}
          automatedLogInjection={automatedLogInjection}
        />
      )}
    </div>
  );
}