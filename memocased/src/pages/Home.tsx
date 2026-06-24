// ─────────────────────────────────────────────────────────────────────────────
// Home Page  —  /home
// Dashboard: "Continue Watching" + "Start Watching" + Activity Streak Banner.
// All data comes from real context (WatchlistContext + DiaryContext).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { useDiary } from "../store/DiaryContext";
import { useWatchlist } from "../store/WatchlistContext";
import { LogModal } from "../components/LogModal";
import type { AutomatedLogData, LogEntry } from "../types/navbar";
import "./Home.css";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  date:    string;
  showId:  number;
  season:  number;
  episode: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function relativeISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayLabel(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

function computeStreak(activeDates: Set<string>): number {
  if (activeDates.size === 0) return 0;
  const today = todayISO();
  const yesterday = relativeISO(-1);
  if (!activeDates.has(today) && !activeDates.has(yesterday)) return 0;
  let streak = 0;
  let offset = activeDates.has(today) ? 0 : -1;
  while (activeDates.has(relativeISO(offset))) { streak++; offset--; }
  return streak;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function CheckIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="check-icon">
      <polyline points="2.5,8.5 6.5,12.5 13.5,4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Continue Watching Card ────────────────────────────────────────────────────

function ContinueWatchingCard({ show, onMarkWatched }: {
  show: { showId: number; title: string; posterUrl: string; currentSeason: number; currentEpisode: number };
  onMarkWatched: (showId: number) => void;
}): React.ReactElement {
  return (
    <article className="cw-card" aria-label={`${show.title}, S${show.currentSeason}E${show.currentEpisode}`}>
      <div className="cw-card__image-wrapper">
        {show.posterUrl
          ? <img className="cw-card__image" src={show.posterUrl} alt={`${show.title}`} loading="lazy" draggable={false} />
          : <div className="cw-card__image cw-card__image--empty" aria-hidden="true" />
        }
        <button className="cw-card__check-button" onClick={() => onMarkWatched(show.showId)}
          aria-label={`Mark S${show.currentSeason}E${show.currentEpisode} of ${show.title} as watched`}>
          <CheckIcon />
        </button>
      </div>
      <div className="cw-card__meta">
        <p className="cw-card__title">{show.title}</p>
        <p className="cw-card__subtitle">S{show.currentSeason}&nbsp;•&nbsp;E{show.currentEpisode}</p>
      </div>
    </article>
  );
}

// ── Start Watching Card ───────────────────────────────────────────────────────

function StartWatchingCard({ item, onPromote }: {
  item: { showId: number; title: string; posterUrl: string };
  onPromote: (showId: number) => void;
}): React.ReactElement {
  return (
    <article className="sw-card" aria-label={`${item.title} — watchlist`}>
      <div className="sw-card__poster-wrapper">
        {item.posterUrl
          ? <img className="sw-card__poster-image" src={item.posterUrl} alt={`${item.title} poster`} loading="lazy" draggable={false} />
          : <div className="sw-card__poster-image sw-card__poster-image--empty" aria-hidden="true" />
        }
        <button className="sw-card__check-button" onClick={() => onPromote(item.showId)}
          aria-label={`Start watching ${item.title}`}>
          <CheckIcon />
        </button>
      </div>
      <div className="sw-card__meta">
        <p className="sw-card__title">{item.title}</p>
        <p className="sw-card__subtitle">S1&nbsp;•&nbsp;E1</p>
      </div>
    </article>
  );
}

// ── Streak Banner ─────────────────────────────────────────────────────────────

function StreakBanner({ currentStreak, activeDates }: {
  currentStreak: number; activeDates: Set<string>;
}): React.ReactElement {
  const today = todayISO();
  const slots = Array.from({ length: 7 }, (_, i) => {
    const isoDate = relativeISO(-(6 - i));
    return { isoDate, label: weekdayLabel(isoDate), isToday: isoDate === today };
  });
  const streakLabel = currentStreak === 0 ? "No streak yet" : `${currentStreak}-day streak`;

  return (
    <aside className="streak-banner" aria-label="Activity streak tracker">
      <div className="streak-banner__left">
        <span className="streak-banner__flame" aria-hidden="true" role="img">🔥</span>
        <div className="streak-banner__text-group">
          <span className="streak-banner__count" aria-live="polite">{streakLabel}</span>
          <span className="streak-banner__sub">Based on episode activity</span>
        </div>
      </div>
      <div className="streak-banner__calendar" role="list" aria-label="Last 7 days of activity">
        {slots.map((slot) => {
          const isActive = activeDates.has(slot.isoDate);
          return (
            <div key={slot.isoDate} className="streak-banner__day-slot" role="listitem">
              <span className={["streak-banner__day-label", slot.isToday ? "streak-banner__day-label--today" : ""].filter(Boolean).join(" ")} aria-hidden="true">
                {slot.label}
              </span>
              <div className={["streak-banner__day-dot", isActive ? "streak-banner__day-dot--active" : "streak-banner__day-dot--inactive", slot.isToday ? "streak-banner__day-dot--today" : ""].filter(Boolean).join(" ")}
                aria-label={isActive ? `${slot.label} — watched` : `${slot.label} — no activity`}
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
  const { user }                                           = useUser();
  const { addLogEntry, diaryLogs }                        = useDiary();
  const { watchlist, currentlyWatching, handleStartWatching } = useWatchlist();
  const username = user?.username ?? "profile";

  const [isLogModalOpen,        setIsLogModalOpen]        = useState(false);
  const [automatedLogInjection, setAutomatedLogInjection] = useState<AutomatedLogData | null>(null);

  // Activity log seeded from real diary entries
  const [extraActivity, setExtraActivity] = useState<ActivityEntry[]>([]);

  const activeDates = useMemo<Set<string>>(() => {
    const fromDiary = diaryLogs.map((l) => l.dateLogged);
    const fromExtra = extraActivity.map((e) => e.date);
    return new Set([...fromDiary, ...fromExtra]);
  }, [diaryLogs, extraActivity]);

  const currentStreak = useMemo(() => computeStreak(activeDates), [activeDates]);

  const recordActivity = useCallback((showId: number, season: number, episode: number) => {
    setExtraActivity((prev) => [...prev, { date: todayISO(), showId, season, episode }]);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsLogModalOpen(false);
    setAutomatedLogInjection(null);
  }, []);

  const handleLogSave = useCallback(async (entry: LogEntry) => {
    await addLogEntry(entry);
    recordActivity(entry.showId, entry.season, 0);
    setIsLogModalOpen(false);
    setAutomatedLogInjection(null);
  }, [addLogEntry, recordActivity]);

  // Mark episode watched — just records activity (no local progress state needed,
  // real progress comes from show_progress table via WatchlistContext)
  const handleMarkWatched = useCallback((showId: number) => {
    const show = currentlyWatching.find((s) => s.showId === showId);
    if (!show) return;
    recordActivity(showId, show.currentSeason, show.currentEpisode);
  }, [currentlyWatching, recordActivity]);

  // Promote watchlist item → watching via context (persists to Supabase)
  const handlePromote = useCallback(async (showId: number) => {
    await handleStartWatching(showId);
    recordActivity(showId, 1, 1);
  }, [handleStartWatching, recordActivity]);

  return (
    <div className="home-page">

      {/* Continue Watching */}
      {currentlyWatching.length > 0 && (
        <section className="cw-section" aria-labelledby="cw-section-heading">
          <div className="cw-section__header">
            <Link to={`/${username}/shows`} className="cw-section__heading-link">
              <h2 className="cw-section__heading" id="cw-section-heading">Continue Watching</h2>
              <span className="cw-section__heading-arrow" aria-hidden="true">›</span>
            </Link>
          </div>
          <div className="cw-section__scroll-container" role="list">
            {currentlyWatching.map((show) => (
              <div key={`cw-${show.showId}`} className="cw-section__card-slot" role="listitem">
                <ContinueWatchingCard show={show} onMarkWatched={handleMarkWatched} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Start Watching (watchlist) */}
      {watchlist.length > 0 && (
        <section className="sw-section" aria-labelledby="sw-section-heading">
          <div className="sw-section__header">
            <Link to={`/${username}/watchlist`} className="sw-section__heading-link">
              <h2 className="sw-section__heading" id="sw-section-heading">Start Watching</h2>
              <span className="sw-section__heading-arrow" aria-hidden="true">›</span>
            </Link>
          </div>
          <div className="sw-section__scroll-container" role="list">
            {watchlist.map((item) => (
              <div key={`sw-${item.showId}`} className="sw-section__card-slot" role="listitem">
                <StartWatchingCard item={item} onPromote={handlePromote} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {currentlyWatching.length === 0 && watchlist.length === 0 && (
        <div className="home-empty">
          <p className="home-empty__title">Nothing here yet.</p>
          <p className="home-empty__sub">Search for a show and add it to your watchlist to get started.</p>
          <Link to="/discover" className="home-empty__cta">Discover Shows →</Link>
        </div>
      )}

      <StreakBanner currentStreak={currentStreak} activeDates={activeDates} />

      {isLogModalOpen && (
        <LogModal onClose={handleCloseModal} onSave={handleLogSave} automatedLogInjection={automatedLogInjection} />
      )}
    </div>
  );
}
