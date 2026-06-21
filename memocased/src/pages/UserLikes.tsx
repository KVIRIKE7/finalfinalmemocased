// ─────────────────────────────────────────────────────────────────────────────
// UserLikes Page  —  /:username/likes
// High-density poster grid of diary entries marked as favorites, newest
// first. Reads from the same shared DiaryContext the Diary and Reviews
// pages read from — a favorite toggled anywhere appears here too.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useParams, NavLink, Navigate, Link } from "react-router-dom";
import { useDiary, type DiaryLogEntry } from "../store/DiaryContext";
import "./UserLikes.css";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab link definitions — mirrors UserProfile.tsx / UserDiary.tsx
// ─────────────────────────────────────────────────────────────────────────────

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
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_ABBREV = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Converts "YYYY-MM-DD" → "02 Jun" (day + month, no year — compressed for
 * a tight grid footer). Splits the string directly rather than going
 * through `new Date()`, which parses bare ISO dates as UTC midnight and
 * can roll back a day in timezones west of UTC.
 */
function formatCompressedDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  const monthLabel = MONTH_ABBREV[month - 1] ?? "";
  return `${String(day).padStart(2, "0")} ${monthLabel}`;
}

/** Strictly filters to favorited entries only. */
function isFavoriteEntry(entry: DiaryLogEntry): boolean {
  return entry.isFavorite === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Star glyphs (active rating, no half-stars) ────────────────────────────────

interface LikeStarsProps {
  rating: number; // 0–5
}

function LikeStars({ rating }: LikeStarsProps): React.ReactElement | null {
  if (rating <= 0) return null;

  const starCount = Math.min(rating, 5); // defensive clamp

  return (
    <span
      className="like-card-wrapper__stars"
      aria-label={`Rated ${starCount} out of 5 stars`}
    >
      {Array.from({ length: starCount }, (_, i) => (
        <span key={i} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

// ── Single favorite poster card ───────────────────────────────────────────────

interface LikeCardProps {
  entry: DiaryLogEntry;
}

function LikeCard({ entry }: LikeCardProps): React.ReactElement {
  return (
    <article
      className="like-card-wrapper"
      aria-label={`${entry.title}, Season ${entry.seasonNumber}, favorited`}
    >
      {/* ── Poster frame ── */}
      <Link to={`/shows/${entry.showId}`} className="like-card-wrapper__poster-link">
        <img
          className="like-card-wrapper__poster"
          src={entry.posterUrl}
          alt={`${entry.title} poster`}
          loading="lazy"
          draggable={false}
        />
      </Link>

      {/* ── Under-poster meta row ── */}
      <div className="like-card-wrapper__meta-row">
        {/* Left: stars + heart */}
        <div className="like-card-wrapper__meta-left">
          <LikeStars rating={entry.rating} />
          <span className="like-card-wrapper__heart" aria-label="Favorited" role="img">
            ♥
          </span>
        </div>

        {/* Right: compressed date */}
        <span className="like-card-wrapper__date">
          {formatCompressedDate(entry.dateLogged)}
        </span>
      </div>
    </article>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyLikesState(): React.ReactElement {
  return (
    <div className="likes-empty-state">
      <p className="likes-empty-state__heading">No favorites yet</p>
      <p className="likes-empty-state__sub">
        Mark a logged season as a favorite and it will show up here.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserLikes(): React.ReactElement {
  const { username } = useParams<{ username: string }>();

  if (!username) return <Navigate to="/home" replace />;

  const { diaryLogs } = useDiary();
  const tabs = buildProfileTabs(username);

  // ── Runtime filter + sort ────────────────────────────────────────────────
  // 1. Keep only entries where isFavorite === true.
  // 2. Sort the filtered result strictly newest-first by dateLogged.
  // Both run fresh on every render against the live shared diaryLogs, so
  // toggling a favorite anywhere (Diary edit, future quick-action, etc.)
  // is reflected here immediately with zero extra wiring.
  const favoriteEntries = diaryLogs
    .filter(isFavoriteEntry)
    .sort((a, b) => new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime());

  return (
    <div className="user-likes-page">

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
      <header className="user-likes-page__header">
        <h1 className="user-likes-page__heading">Likes</h1>
        <span className="user-likes-page__count">
          {favoriteEntries.length} {favoriteEntries.length === 1 ? "favorite" : "favorites"}
        </span>
      </header>

      {/* ════════════════════════════════════════════
          LIKES GRID  or  EMPTY STATE
      ════════════════════════════════════════════ */}
      {favoriteEntries.length === 0 ? (
        <EmptyLikesState />
      ) : (
        <div
          className="likes-media-grid"
          role="list"
          aria-label={`${favoriteEntries.length} favorited shows`}
        >
          {favoriteEntries.map((entry) => (
            <div key={entry.logId} className="likes-media-grid__item" role="listitem">
              <LikeCard entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}