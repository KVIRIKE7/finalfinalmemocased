// ─────────────────────────────────────────────────────────────────────────────
// UserProfile Page  —  /:username
// Header banner · stat counters · sub-tab nav · 4-slot favorites grid.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useParams, Link, NavLink, Navigate } from "react-router-dom";
import { getPosterUrl } from "../utils/tmdbImage";
import { useUser } from "../store/UserContext";
import "./UserProfile.css";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FavoriteShow {
  showId: number;
  title: string;
  posterPath: string | null; // raw TMDB poster path (e.g. "/abc123.jpg")
  releaseYear: string;
}

interface ProfileStats {
  showsCompleted: number;
  currentlyWatching: number;
  dropped: number;
}

// Sub-tab definition
interface ProfileTab {
  label: string;
  to: string; // fully-resolved path (built from username)
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// Replace posterPath values with real TMDB paths as the data layer grows.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_FAVORITES: FavoriteShow[] = [
  {
    showId: 1396,
    title: "Breaking Bad",
    posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    releaseYear: "2008",
  },
  {
    showId: 1399,
    title: "Game of Thrones",
    posterPath: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    releaseYear: "2011",
  },
  {
    showId: 66732,
    title: "Stranger Things",
    posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    releaseYear: "2016",
  },
  {
    showId: 63333,
    title: "The Bear",
    posterPath: "/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    releaseYear: "2022",
  },
];

// Mock stats — wire to real state arrays (progress[], completedShows[], etc.)
// once a global store is in place. Counts are illustrative for now.
const MOCK_STATS: ProfileStats = {
  showsCompleted:    12,
  currentlyWatching:  4,
  dropped:            2,
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Avatar circle with initial fallback ──────────────────────────────────────

interface ProfileAvatarProps {
  username: string;
  avatarUrl: string | null;
  size?: "lg" | "xl";
}

function ProfileAvatar({
  username,
  avatarUrl,
  size = "xl",
}: ProfileAvatarProps): React.ReactElement {
  const initial = username.charAt(0).toUpperCase();

  return (
    <div
      className={`profile-avatar profile-avatar--${size}`}
      aria-label={`${username}'s avatar`}
    >
      {avatarUrl ? (
        <img
          className="profile-avatar__image"
          src={avatarUrl}
          alt={`${username} profile picture`}
        />
      ) : (
        <span className="profile-avatar__initial" aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  );
}

// ── Stat counter block ────────────────────────────────────────────────────────

interface StatCounterProps {
  label: string;
  value: number;
}

function StatCounter({ label, value }: StatCounterProps): React.ReactElement {
  return (
    <div className="profile-stat">
      <span className="profile-stat__value">{value.toLocaleString()}</span>
      <span className="profile-stat__label">{label}</span>
    </div>
  );
}

// ── Favorite show card ────────────────────────────────────────────────────────

interface FavoriteCardProps {
  show: FavoriteShow;
  slot: number; // 1-based slot index for accessibility
}

function FavoriteCard({ show, slot }: FavoriteCardProps): React.ReactElement {
  const posterUrl = getPosterUrl(show.posterPath, "w342");

  return (
    <Link
      to={`/shows/${show.showId}`}
      className="favorite-card"
      aria-label={`Favorite ${slot}: ${show.title} (${show.releaseYear})`}
    >
      {/* ── 2:3 poster ── */}
      <div className="favorite-card__poster-wrapper">
        {posterUrl ? (
          <img
            className="favorite-card__poster-image"
            src={posterUrl}
            alt={`${show.title} poster`}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="favorite-card__poster-fallback" aria-hidden="true">
            <span className="favorite-card__poster-fallback-icon">📺</span>
          </div>
        )}

        {/* Slot number badge — top-left corner */}
        <span className="favorite-card__slot-badge" aria-hidden="true">
          {slot}
        </span>
      </div>

      {/* ── Text below poster ── */}
      <div className="favorite-card__meta">
        <p className="favorite-card__title">{show.title}</p>
        <p className="favorite-card__year">{show.releaseYear}</p>
      </div>
    </Link>
  );
}

// ── Favorite card empty slot ──────────────────────────────────────────────────

interface EmptyFavoriteSlotProps {
  slot: number;
}

function EmptyFavoriteSlot({ slot }: EmptyFavoriteSlotProps): React.ReactElement {
  return (
    <button
      className="favorite-card favorite-card--empty"
      type="button"
      aria-label={`Add favorite show to slot ${slot}`}
      title="Click to add a favorite show"
    >
      <div className="favorite-card__poster-wrapper">
        <div className="favorite-card__empty-poster" aria-hidden="true">
          <span className="favorite-card__empty-icon">＋</span>
        </div>
        <span className="favorite-card__slot-badge" aria-hidden="true">
          {slot}
        </span>
      </div>
      <div className="favorite-card__meta">
        <p className="favorite-card__title favorite-card__title--empty">
          Add a show
        </p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserProfile(): React.ReactElement {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useUser();

  // Guard: username param must be present (React Router guarantees it
  // for a /:username route, but TypeScript marks it as possibly undefined)
  if (!username) {
    return <Navigate to="/home" replace />;
  }

  // Determine if the viewer is looking at their own profile
  const isOwnProfile = currentUser?.username === username;

  // Favorites state — 4 slots; pad with null if fewer than 4 are set
  const [favorites] = useState<(FavoriteShow | null)[]>(() => {
    const padded: (FavoriteShow | null)[] = [...MOCK_FAVORITES];
    while (padded.length < 4) padded.push(null);
    return padded.slice(0, 4); // enforce exactly 4 slots
  });

  // Stats — wire to real global state arrays once a store exists
  const stats: ProfileStats = MOCK_STATS;

  // ── Sub-tab definitions ───────────────────────────────────────────────────

  const PROFILE_TABS: ProfileTab[] = [
    { label: "Profile",   to: `/${username}` },
    { label: "Shows",     to: `/${username}/shows` },
    { label: "Diary",     to: `/${username}/diary` },
    { label: "Reviews",   to: `/${username}/reviews` },
    { label: "Watchlist", to: `/${username}/watchlist` },
    { label: "Likes",     to: `/${username}/likes` },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="user-profile-page">

      {/* ════════════════════════════════════════════
          1. PROFILE HEADER BANNER
      ════════════════════════════════════════════ */}
      <header className="profile-header">
        {/* Decorative banner background — swap for a real backdrop image later */}
        <div className="profile-header__banner" aria-hidden="true" />

        <div className="profile-header__content">
          {/* ── Left: avatar + username ── */}
          <div className="profile-header__identity">
            <ProfileAvatar
              username={username}
              avatarUrl={currentUser?.avatarUrl ?? null}
              size="xl"
            />

            <div className="profile-header__name-group">
              <h1 className="profile-header__username">{username}</h1>
              {currentUser?.displayName && isOwnProfile && (
                <p className="profile-header__display-name">
                  {currentUser.displayName}
                </p>
              )}
            </div>
          </div>

          {/* ── Right: stat counters ── */}
          <div className="profile-header__stats" role="list" aria-label="Profile statistics">
            <div role="listitem">
              <StatCounter label="SHOWS COMPLETED"   value={stats.showsCompleted} />
            </div>
            <div className="profile-header__stats-divider" aria-hidden="true" />
            <div role="listitem">
              <StatCounter label="CURRENTLY WATCHING" value={stats.currentlyWatching} />
            </div>
            <div className="profile-header__stats-divider" aria-hidden="true" />
            <div role="listitem">
              <StatCounter label="DROPPED" value={stats.dropped} />
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════
          2. PROFILE SUB-TAB NAVIGATION
      ════════════════════════════════════════════ */}
      <nav className="profile-tabs" aria-label="Profile sections">
        <ul className="profile-tabs__list" role="list">
          {PROFILE_TABS.map((tab) => (
            <li key={tab.to} className="profile-tabs__item" role="listitem">
              <NavLink
                to={tab.to}
                end                           /* exact match — avoids /:username
                                                matching /:username/diary etc.  */
                className={({ isActive }) =>
                  [
                    "profile-tabs__link",
                    isActive ? "profile-tabs__link--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                aria-current={tab.to === `/${username}` ? "page" : undefined}
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ════════════════════════════════════════════
          3. PAGE BODY
      ════════════════════════════════════════════ */}
      <div className="profile-body">

        {/* ── FAVORITE SHOWS section ── */}
        <section
          className="profile-favorites"
          aria-labelledby="profile-favorites-heading"
        >
          <div className="profile-favorites__header">
            <h2
              className="profile-favorites__title"
              id="profile-favorites-heading"
            >
              FAVORITE SHOWS
            </h2>

            {isOwnProfile && (
              <button
                className="profile-favorites__edit-button"
                type="button"
                aria-label="Edit favorite shows"
              >
                Edit
              </button>
            )}
          </div>

          {/* Exactly 4 equal-width slots */}
          <div
            className="profile-favorites__grid"
            role="list"
            aria-label="Favorite shows (4 slots)"
          >
            {favorites.map((show, index) => {
              const slot = index + 1;
              return (
                <div
                  key={show ? `fav-${show.showId}` : `fav-empty-${slot}`}
                  className="profile-favorites__slot"
                  role="listitem"
                >
                  {show ? (
                    <FavoriteCard show={show} slot={slot} />
                  ) : (
                    <EmptyFavoriteSlot slot={slot} />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Placeholder for future profile sections (Recent Activity, Reviews, etc.) */}
        <section className="profile-recent-activity" aria-labelledby="profile-activity-heading">
          <h2 className="profile-section__title" id="profile-activity-heading">
            RECENT ACTIVITY
          </h2>
          <p className="profile-section__empty">
            No activity yet. Start watching a show!
          </p>
        </section>

      </div>
    </div>
  );
}