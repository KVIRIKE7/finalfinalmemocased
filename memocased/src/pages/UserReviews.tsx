// ─────────────────────────────────────────────────────────────────────────────
// UserReviews Page  —  /:username/reviews
// Vertical feed of diary entries that carry written review text, newest
// first. Reads from the same shared DiaryContext the Diary page and Navbar's
// LogModal write into — a new review saved anywhere appears here too.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useParams, NavLink, Navigate, Link } from "react-router-dom";
import { useDiary, type DiaryLogEntry } from "../store/DiaryContext";
import "./UserReviews.css";

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
 * Converts "YYYY-MM-DD" → "17 Jun 2026" without going through the Date/
 * timezone machinery — a bare ISO date string parsed via `new Date()` is
 * treated as UTC midnight and can roll back a day in timezones west of
 * UTC. Splitting the string directly avoids that entirely.
 */
function formatReadableDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const monthLabel = MONTH_ABBREV[month - 1] ?? "";
  return `${day} ${monthLabel} ${year}`;
}

/** Returns true only when reviewText exists and has non-whitespace content. */
function hasWrittenReview(entry: DiaryLogEntry): boolean {
  return Boolean(entry.reviewText && entry.reviewText.trim().length > 0);
}

/** Naive English pluraliser for the like-count footer line. */
function formatLikeCount(count: number): string {
  if (count === 0) return "No likes yet";
  if (count === 1) return "1 like";
  return `${count} likes`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Star rating glyphs ────────────────────────────────────────────────────────

interface ReviewStarsProps {
  rating: number; // 0–5
}

function ReviewStars({ rating }: ReviewStarsProps): React.ReactElement | null {
  if (rating <= 0) return null;

  const starCount = Math.min(rating, 5); // defensive clamp

  return (
    <span
      className="review-feed-item__stars"
      aria-label={`Rated ${starCount} out of 5 stars`}
    >
      {Array.from({ length: starCount }, (_, i) => (
        <span key={i} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

// ── Single review card ────────────────────────────────────────────────────────

interface ReviewFeedItemProps {
  entry: DiaryLogEntry;
}

function ReviewFeedItem({ entry }: ReviewFeedItemProps): React.ReactElement {
  return (
    <article
      className="review-feed-item"
      aria-label={`Review: ${entry.title}, Season ${entry.seasonNumber}`}
    >
      {/* ── Left: poster ── */}
      <div className="review-feed-item__poster-col">
        <Link to={`/shows/${entry.showId}`} className="review-feed-item__poster-link">
          <img
            className="review-feed-item__poster"
            src={entry.posterUrl}
            alt={`${entry.title} poster`}
            loading="lazy"
            draggable={false}
          />
        </Link>
      </div>

      {/* ── Right: metadata stack ── */}
      <div className="review-feed-item__body-col">

        {/* Row 1: show header */}
        <h3 className="review-feed-item__header">
          <Link to={`/shows/${entry.showId}`} className="review-feed-item__title-link">
            {entry.title}
          </Link>
          <span className="review-feed-item__season-suffix">
            : Season {entry.seasonNumber}
          </span>
          {/*
            NOTE: DiaryLogEntry carries no release-year field today — the
            spec calls for one here, but inventing a value would mean
            fabricating data. Once a releaseYear field exists upstream
            (e.g. denormalised at save time the same way posterUrl is),
            render it here as:
              <span className="review-feed-item__year"> ({releaseYear})</span>
          */}
        </h3>

        {/* Row 2: log status line — stars + watched date */}
        <div className="review-feed-item__status-line">
          <ReviewStars rating={entry.rating} />
          <span className="review-feed-item__watched-text">
            Watched {formatReadableDate(entry.dateLogged)}
          </span>
        </div>

        {/* Row 3: review body text */}
        <p className="review-body-content">{entry.reviewText}</p>

        {/* Row 4: footer engagement line */}
        <div className="review-feed-item__footer">
          <span className="review-feed-item__like-icon" aria-hidden="true">
            ♡
          </span>
          <span className="review-feed-item__like-count">
            {formatLikeCount(0)}
          </span>
        </div>

      </div>
    </article>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyReviewsState(): React.ReactElement {
  return (
    <div className="reviews-empty-state">
      <p className="reviews-empty-state__heading">No reviews yet</p>
      <p className="reviews-empty-state__sub">
        Write something when you log a season and it will show up here.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserReviews(): React.ReactElement {
  const { username } = useParams<{ username: string }>();

  if (!username) return <Navigate to="/home" replace />;

  const { diaryLogs } = useDiary();
  const tabs = buildProfileTabs(username);

  // ── Runtime filter + sort ────────────────────────────────────────────────
  // 1. Keep only entries with non-empty, non-whitespace reviewText.
  // 2. Sort the filtered result strictly newest-first by dateLogged.
  // Both steps happen fresh on every render — diaryLogs is shared global
  // state, so a save from any page (Navbar's + LOG, Diary's edit pencil)
  // is immediately reflected here without any extra wiring.
  const reviewedEntries = diaryLogs
    .filter(hasWrittenReview)
    .sort((a, b) => new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime());

  return (
    <div className="user-reviews-page">

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
      <header className="user-reviews-page__header">
        <h1 className="user-reviews-page__heading">Reviews</h1>
      </header>

      {/* ════════════════════════════════════════════
          REVIEW FEED  or  EMPTY STATE
      ════════════════════════════════════════════ */}
      {reviewedEntries.length === 0 ? (
        <EmptyReviewsState />
      ) : (
        <div
          className="reviews-feed-container"
          role="feed"
          aria-label={`${reviewedEntries.length} reviews`}
        >
          {reviewedEntries.map((entry) => (
            <ReviewFeedItem key={entry.logId} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}