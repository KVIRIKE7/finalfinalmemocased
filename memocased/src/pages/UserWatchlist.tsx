// ─────────────────────────────────────────────────────────────────────────────
// UserWatchlist Page  —  /:username/watchlist
// Responsive grid of split-panel cards: poster on the left, metadata stack
// on the right (title, episode pointer, year/rating, episode count, chevron).
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useParams, NavLink, Navigate } from "react-router-dom";
import { useWatchlist, type WatchlistShowEntry } from "../store/WatchlistContext";
import "./UserWatchlist.css";

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: WatchlistShowEntry and its mock seed data now live in
// WatchlistContext.tsx — that is the shared source of truth this page reads
// from. The "Start Watching" chevron action atomically moves a show from
// `watchlist` into `currentlyWatching`, both owned by that same context, so
// importing the type here (rather than redeclaring it locally) guarantees
// the two can never drift apart.
// ─────────────────────────────────────────────────────────────────────────────

// Sub-tab link definitions — mirrors UserProfile.tsx / UserDiary.tsx
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
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Three-dot menu button ─────────────────────────────────────────────────────

interface OverflowMenuButtonProps {
  title: string;
  onClick: () => void;
}

function OverflowMenuButton({ title, onClick }: OverflowMenuButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      className="watchlist-split-card__overflow-button"
      onClick={onClick}
      aria-label={`More options for ${title}`}
      aria-haspopup="menu"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="3"  r="1.4" fill="currentColor" />
        <circle cx="8" cy="8"  r="1.4" fill="currentColor" />
        <circle cx="8" cy="13" r="1.4" fill="currentColor" />
      </svg>
    </button>
  );
}

// ── Chevron-down "Start Watching" trigger button ──────────────────────────────

interface ChevronButtonProps {
  title: string;
  onClick: () => void;
}

function ChevronButton({ title, onClick }: ChevronButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      className="watchlist-split-card__chevron-button"
      onClick={onClick}
      aria-label={`Start watching ${title}`}
      title="Start watching"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ── Individual split card ─────────────────────────────────────────────────────

interface WatchlistSplitCardProps {
  entry: WatchlistShowEntry;
  onStartWatching: (showId: number) => void;
}

function WatchlistSplitCard({ entry, onStartWatching }: WatchlistSplitCardProps): React.ReactElement {
  function handleOverflowClick(): void {
    // Placeholder — will open a context menu (remove, mark as started, etc.)
    console.log("OPEN OVERFLOW MENU FOR:", entry.title);
  }

  return (
    <article
      className="watchlist-split-card"
      aria-label={`${entry.title} (${entry.releaseYear})`}
    >
      {/* ── Left: poster frame ── */}
      <div className="watchlist-poster-side">
        <img
          className="watchlist-poster-side__image"
          src={entry.posterUrl}
          alt={`${entry.title} poster`}
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* ── Right: metadata panel ── */}
      <div className="watchlist-info-side">

        {/* Row 1: title + episode pointer + overflow menu */}
        <div className="watchlist-info-side__top-row">
          <div className="watchlist-info-side__title-group">
            <h3 className="watchlist-info-side__title">{entry.title}</h3>
            <p className="watchlist-info-side__episode-pointer">
              {entry.nextEpisodePointer}
            </p>
          </div>

          <OverflowMenuButton title={entry.title} onClick={handleOverflowClick} />
        </div>

        {/* Row 2: year/rating (left) — episode count (right) */}
        <div className="watchlist-info-side__middle-row">
          <div className="watchlist-info-side__year-rating-group">
            <span className="watchlist-info-side__year">{entry.releaseYear}</span>
            <span className="watchlist-info-side__rating">{entry.contentRating}</span>
          </div>

          <span className="watchlist-info-side__episode-count">
            {entry.totalEpisodesCount} eps.
          </span>
        </div>

        {/* Row 3: chevron action, bottom-right — triggers Start Watching */}
        <div className="watchlist-info-side__bottom-row">
          <ChevronButton
            title={entry.title}
            onClick={() => onStartWatching(entry.showId)}
          />
        </div>

      </div>
    </article>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyWatchlistState(): React.ReactElement {
  return (
    <div className="watchlist-empty-state">
      <p className="watchlist-empty-state__heading">Your watchlist is empty</p>
      <p className="watchlist-empty-state__sub">
        Find a show you want to watch and add it here.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserWatchlist(): React.ReactElement {
  const { username } = useParams<{ username: string }>();

  if (!username) return <Navigate to="/home" replace />;

  // watchlist and handleStartWatching now come from the shared
  // WatchlistContext — the exact same arrays a future Home.tsx integration
  // (or any other page) would read and write. Clicking the chevron here
  // atomically moves a show into `currentlyWatching`, which is owned by
  // the same context, so the card disappears from this grid immediately
  // on the next render with zero extra wiring.
  const { watchlist, handleStartWatching } = useWatchlist();

  const tabs = buildProfileTabs(username);

  return (
    <div className="user-watchlist-page">

      {/* ════════════════════════════════════════════
          SHARED PROFILE SUB-TAB NAV
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
          PAGE HEADER
      ════════════════════════════════════════════ */}
      <header className="user-watchlist-page__header">
        <h1 className="user-watchlist-page__heading">Watchlist</h1>
        <span className="user-watchlist-page__count">
          {watchlist.length} {watchlist.length === 1 ? "show" : "shows"}
        </span>
      </header>

      {/* ════════════════════════════════════════════
          WATCHLIST GRID  or  EMPTY STATE
      ════════════════════════════════════════════ */}
      {watchlist.length === 0 ? (
        <EmptyWatchlistState />
      ) : (
        <div
          className="watchlist-media-grid"
          role="list"
          aria-label={`${watchlist.length} shows on watchlist`}
        >
          {watchlist.map((entry) => (
            <div
              key={`watchlist-${entry.showId}`}
              className="watchlist-media-grid__item"
              role="listitem"
            >
              <WatchlistSplitCard entry={entry} onStartWatching={handleStartWatching} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}