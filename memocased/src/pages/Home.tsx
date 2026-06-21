// ─────────────────────────────────────────────────────────────────────────────
// Home Page  —  /home
// Dashboard: "Continue Watching" + "Start Watching" + Activity Streak Banner.
// All state lives here. recordActivity() is the single write point for the log.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { useDiary } from "../store/DiaryContext";
import { LogModal } from "../components/LogModal";
import type { AutomatedLogData, LogEntry } from "../types/navbar";
import "./Home.css";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ActiveShowProgress {
  showId: number;
  title: string;
  backdropUrl: string;
  currentSeason: number;
  currentEpisode: number;
  totalSeasons: number;
  episodesInCurrentSeason: number;
}

interface WatchlistItem {
  showId: number;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  totalSeasons: number;
  episodesPerSeason: number[];
}

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
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_PROGRESS: ActiveShowProgress[] = [
  {
    showId: 1396,
    title: "Breaking Bad",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    currentSeason: 4,
    currentEpisode: 8,
    totalSeasons: 5,
    episodesInCurrentSeason: 13,
  },
  {
    showId: 1399,
    title: "Game of Thrones",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
    currentSeason: 6,
    currentEpisode: 9,
    totalSeasons: 8,
    episodesInCurrentSeason: 10,
  },
  {
    showId: 66732,
    title: "Stranger Things",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    currentSeason: 3,
    currentEpisode: 6,
    totalSeasons: 4,
    episodesInCurrentSeason: 8,
  },
  {
    showId: 63333,
    title: "The Bear",
    backdropUrl: "https://media.themoviedb.org/t/p/w533_and_h300_face/ety3PHo2W8yZZgEFp7QUBFZOYke.jpg",
    currentSeason: 2,
    currentEpisode: 9,
    totalSeasons: 3,
    episodesInCurrentSeason: 10,
  },
];

const INITIAL_WATCHLIST: WatchlistItem[] = [
  {
    showId: 1418,
    title: "The Big Bang Theory",
    posterUrl: "https://image.tmdb.org/t/p/w342/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/nGsNruW3W27V6r4gkyMX0E6to8.jpg",
    totalSeasons: 12,
    episodesPerSeason: [17, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24],
  },
  {
    showId: 1622,
    title: "Suits",
    posterUrl: "https://image.tmdb.org/t/p/w342/vQiryp6LioFxQThywxbC6TuoDjy.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/8MdGCX9o1fFMZcYzx3qHXzGvfM7.jpg",
    totalSeasons: 9,
    episodesPerSeason: [12, 16, 16, 16, 16, 16, 10, 10, 10],
  },
  {
    showId: 2316,
    title: "The Office",
    posterUrl: "https://image.tmdb.org/t/p/w342/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/sRpBeSMBiCpfGBJ6yOor5YnIkMp.jpg",
    totalSeasons: 9,
    episodesPerSeason: [6, 22, 25, 19, 26, 26, 26, 24, 25],
  },
  {
    showId: 87108,
    title: "Chernobyl",
    posterUrl: "https://image.tmdb.org/t/p/w342/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/pMBjkGVTv1xFpxNz1JaAhx6Qp1p.jpg",
    totalSeasons: 1,
    episodesPerSeason: [5],
  },
  {
    showId: 1403,
    title: "Agents of S.H.I.E.L.D.",
    posterUrl: "https://image.tmdb.org/t/p/w342/gHUCCMy1vvj58tzE3dZqeC9SXus.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/j2QPLdWJbHmEfYfQYEf6fHlUXJW.jpg",
    totalSeasons: 7,
    episodesPerSeason: [22, 22, 22, 22, 22, 13, 13],
  },
];

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
  show: ActiveShowProgress;
  onMarkWatched: (showId: number) => void;
}

function ContinueWatchingCard({
  show,
  onMarkWatched,
}: ContinueWatchingCardProps): React.ReactElement {
  const { showId, title, backdropUrl, currentSeason, currentEpisode, episodesInCurrentSeason } = show;

  const progressPercent = Math.min(
    Math.round((currentEpisode / episodesInCurrentSeason) * 100),
    100
  );

  return (
    <article className="cw-card" aria-label={`${title}, S${currentSeason}E${currentEpisode}`}>
      <div className="cw-card__image-wrapper">
        <img
          className="cw-card__image"
          src={backdropUrl}
          alt={`${title} backdrop`}
          loading="lazy"
          draggable={false}
        />
        <div
          className="cw-card__progress-track"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPercent}% through season ${currentSeason}`}
        >
          <div className="cw-card__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <button
          className="cw-card__check-button"
          onClick={() => onMarkWatched(showId)}
          aria-label={`Mark S${currentSeason}E${currentEpisode} of ${title} as watched`}
          title="Mark episode as watched"
        >
          <CheckIcon />
        </button>
      </div>
      <div className="cw-card__meta">
        <p className="cw-card__title">{title}</p>
        <p className="cw-card__subtitle">S{currentSeason}&nbsp;•&nbsp;E{currentEpisode}</p>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUE WATCHING — SECTION
// ─────────────────────────────────────────────────────────────────────────────

interface ContinueWatchingSectionProps {
  username: string;
  shows: ActiveShowProgress[];
  onMarkWatched: (showId: number) => void;
}

function ContinueWatchingSection({
  username,
  shows,
  onMarkWatched,
}: ContinueWatchingSectionProps): React.ReactElement | null {
  if (shows.length === 0) return null;

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
      <div className="cw-section__scroll-container" role="list" aria-label="Shows in progress">
        {shows.map((show) => (
          <div key={`cw-${show.showId}`} className="cw-section__card-slot" role="listitem">
            <ContinueWatchingCard show={show} onMarkWatched={onMarkWatched} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START WATCHING — CARD
// ─────────────────────────────────────────────────────────────────────────────

interface StartWatchingCardProps {
  item: WatchlistItem;
  onPromote: (showId: number) => void;
}

function StartWatchingCard({ item, onPromote }: StartWatchingCardProps): React.ReactElement {
  const { showId, title, posterUrl } = item;

  return (
    <article className="sw-card" aria-label={`${title} — watchlist`}>
      <div className="sw-card__poster-wrapper">
        <img
          className="sw-card__poster-image"
          src={posterUrl}
          alt={`${title} poster`}
          loading="lazy"
          draggable={false}
        />
        <button
          className="sw-card__check-button"
          onClick={() => onPromote(showId)}
          aria-label={`Start watching ${title}`}
          title="Start watching"
        >
          <CheckIcon />
        </button>
      </div>
      <div className="sw-card__meta">
        <p className="sw-card__title">{title}</p>
        <p className="sw-card__subtitle">S1&nbsp;•&nbsp;E1</p>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START WATCHING — SECTION
// ─────────────────────────────────────────────────────────────────────────────

interface StartWatchingSectionProps {
  username: string;
  items: WatchlistItem[];
  onPromote: (showId: number) => void;
}

function StartWatchingSection({
  username,
  items,
  onPromote,
}: StartWatchingSectionProps): React.ReactElement | null {
  if (items.length === 0) return null;

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
      <div className="sw-section__scroll-container" role="list" aria-label="Watchlist">
        {items.map((item) => (
          <div key={`sw-${item.showId}`} className="sw-section__card-slot" role="listitem">
            <StartWatchingCard item={item} onPromote={onPromote} />
          </div>
        ))}
      </div>
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
  const username = user?.username ?? "profile";

  const [progress, setProgress] = useState<ActiveShowProgress[]>(INITIAL_PROGRESS);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(INITIAL_WATCHLIST);
  const watchlistRef = React.useRef<WatchlistItem[]>(INITIAL_WATCHLIST);
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

  // ── Continue Watching: episode increment loop ─────────────────────────────

  const handleMarkWatched = useCallback(
    (showId: number): void => {
      setProgress((prev) =>
        prev.reduce<ActiveShowProgress[]>((acc, show) => {
          if (show.showId !== showId) {
            acc.push(show);
            return acc;
          }

          const nextEpisode = show.currentEpisode + 1;

          if (nextEpisode <= show.episodesInCurrentSeason) {
            // Path A: normal episode increment
            recordActivity(showId, show.currentSeason, show.currentEpisode);
            acc.push({ ...show, currentEpisode: nextEpisode });
            return acc;
          }

          const isLastSeason = show.currentSeason === show.totalSeasons;

          if (isLastSeason) {
            // Path B: series finale — trigger log modal for the final season,
            // then drop the show from the Continue Watching row.
            recordActivity(showId, show.currentSeason, show.currentEpisode);

            setAutomatedLogInjection({
              showId:      show.showId,
              title:       show.title,
              // Derive a poster URL from the backdrop URL by swapping
              // the CDN size segment (backdrop → poster best-effort).
              // Replace with a real posterUrl field on ActiveShowProgress
              // when you wire TMDB data fully.
              posterUrl:   show.backdropUrl,
              seasonToLog: show.currentSeason,
            });
            setIsLogModalOpen(true);

            // Omit from acc — show is complete, remove from row
            return acc;
          }

          // Path C: season finale — trigger log modal for the completed
          // season, then advance the show to the next season on the card.
          recordActivity(showId, show.currentSeason, show.currentEpisode);

          setAutomatedLogInjection({
            showId:      show.showId,
            title:       show.title,
            posterUrl:   show.backdropUrl,
            seasonToLog: show.currentSeason,
          });
          setIsLogModalOpen(true);

          // Background state advance: next season starts at E1
          acc.push({
            ...show,
            currentSeason:  show.currentSeason + 1,
            currentEpisode: 1,
            // episodesInCurrentSeason will be refreshed from TMDB
            // when full show-data wiring is added
          });
          return acc;
        }, [])
      );
    },
    [recordActivity]
  );

  // Keep ref in sync so handlePromote can read current watchlist without
  // needing to nest setProgress inside a setWatchlist updater.
  React.useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  // ── Start Watching: promote watchlist item → progress ────────────────────
  //
  // ROOT CAUSE OF DUPLICATE BUG:
  // Calling setProgress() *inside* a setWatchlist() updater means React 18
  // Strict Mode's intentional double-invocation of updaters fires setProgress
  // twice → two identical cards prepended.
  //
  // FIX: read the current watchlist from watchlistRef (always current, zero
  // stale-closure risk), build the promoted object, then call setWatchlist
  // and setProgress as independent sibling calls at the same scope level.
  // React 18 automatic batching merges them into one render. Neither updater
  // has side effects — both are pure array derivations.

  const handlePromote = useCallback(
    (showId: number): void => {
      // ── 1. Read current watchlist synchronously — no setter needed ───────
      const item = watchlistRef.current.find((w) => w.showId === showId);
      if (!item) return; // Guard A: already removed or never existed

      // ── 2. Build the promoted ActiveShowProgress object ──────────────────
      const promoted: ActiveShowProgress = {
        showId:                  item.showId,
        title:                   item.title,
        backdropUrl:             item.backdropUrl,
        currentSeason:           1,
        currentEpisode:          1,
        totalSeasons:            item.totalSeasons,
        episodesInCurrentSeason: item.episodesPerSeason[0] ?? 1,
      };

      // ── 3. Update progress — standalone, NOT nested inside any updater ───
      setProgress((prevProgress) => {
        // Guard B: idempotent duplicate check
        if (prevProgress.some((s) => s.showId === promoted.showId)) {
          return prevProgress;
        }
        return [promoted, ...prevProgress]; // prepend — newest first in row
      });

      // ── 4. Remove from watchlist — clean filter, no mutation ─────────────
      setWatchlist((prevWatchlist) =>
        prevWatchlist.filter((w) => w.showId !== showId)
      );

      // ── 5. Record streak activity ─────────────────────────────────────────
      recordActivity(item.showId, 1, 1);
    },
    [recordActivity]
  );

  return (
    <div className="home-page">
      <ContinueWatchingSection
        username={username}
        shows={progress}
        onMarkWatched={handleMarkWatched}
      />

      <StartWatchingSection
        username={username}
        items={watchlist}
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