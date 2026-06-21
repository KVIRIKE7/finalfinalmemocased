// ─────────────────────────────────────────────────────────────────────────────
// UserDiary Page  —  /:username/diary
// Chronological ledger of logged seasons, grouped by month with a sticky
// month banner on the leftmost column.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useParams, NavLink, Navigate } from "react-router-dom";
import { LogModal, type EditableLogEntry } from "../components/LogModal";
import { useDiary, type DiaryLogEntry } from "../store/DiaryContext";
import type { LogEntry } from "../types/navbar";
import "./UserDiary.css";

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: DiaryLogEntry and its mock seed data now live in DiaryContext.tsx —
// that is the shared source of truth both this page and the Navbar's
// LogModal write into. Importing the type from there (rather than
// redeclaring it locally) guarantees the two can never drift apart again.
// ─────────────────────────────────────────────────────────────────────────────

// Sub-tab link definitions — mirrors UserProfile.tsx / UserShowsProgress.tsx
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
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** Parses "YYYY-MM-DD" into numeric components without timezone drift. */
function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day }; // month is 1-indexed here (matches the string)
}

/** Returns a "MONTH YYYY" label, e.g. "JUNE 2026". */
function monthYearLabel(iso: string): string {
  const { year, month } = parseISODate(iso);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Returns just the day-of-month as a string, e.g. "15". */
function dayOfMonth(iso: string): string {
  const { day } = parseISODate(iso);
  return String(day);
}

/** Returns a "MONTH YYYY" key used purely for equality comparison. */
function monthYearKey(iso: string): string {
  const { year, month } = parseISODate(iso);
  return `${year}-${month}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Star rating display ───────────────────────────────────────────────────────

interface StarRatingProps {
  rating: number; // 0–5, 0 = unrated
}

function StarRating({ rating }: StarRatingProps): React.ReactElement | null {
  // Unrated — render nothing, not even an empty star track
  if (rating <= 0) return null;

  // Clamp defensively in case upstream data ever exceeds the 1–5 contract
  const starCount = Math.min(rating, 5);

  return (
    <span
      className="diary-star-rating"
      aria-label={`Rated ${starCount} out of 5 stars`}
    >
      {Array.from({ length: starCount }, (_, i) => (
        <span
          key={i}
          className="diary-star-rating__star"
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ── Single diary row ──────────────────────────────────────────────────────────

interface DiaryRowProps {
  entry: DiaryLogEntry;
  showMonthBanner: boolean;
  onOpenReview: (reviewText: string) => void;
  onEditEntry: (logId: string) => void;
}

function DiaryRow({
  entry,
  showMonthBanner,
  onOpenReview,
  onEditEntry,
}: DiaryRowProps): React.ReactElement {
  // A review button only renders when reviewText is a non-empty string.
  // Covers undefined, missing key, and "" — all three collapse to false.
  const hasReview = Boolean(entry.reviewText && entry.reviewText.trim().length > 0);

  return (
    <div className="diary-row" role="row">

      {/* ── Column 1: Month sticky banner (only on group's first row) ── */}
      <div className="diary-row__month-col" role="cell">
        {showMonthBanner && (
          <span className="diary-row__month-label">
            {monthYearLabel(entry.dateLogged)}
          </span>
        )}
      </div>

      {/* ── Column 2: Day digit ── */}
      <div className="diary-row__day-col" role="cell">
        <span className="diary-row__day-number">
          {dayOfMonth(entry.dateLogged)}
        </span>
      </div>

      {/* ── Column 3: Poster thumbnail + title/season ── */}
      <div className="diary-row__media-col" role="cell">
        <img
          className="diary-row__poster-thumb"
          src={entry.posterUrl}
          alt={`${entry.title} poster`}
          loading="lazy"
          draggable={false}
        />
        <span className="diary-row__media-title">
          {entry.title}: Season {entry.seasonNumber}
        </span>
      </div>

      {/* ── Column 4: Rating ── */}
      <div className="diary-row__rating-col" role="cell" aria-label="Rating">
        <StarRating rating={entry.rating} />
      </div>

      {/* ── Column 5: Like / heart ── */}
      <div className="diary-row__like-col" role="cell" aria-label="Favorite">
        {entry.isFavorite && (
          <span
            className="diary-row__heart-icon"
            role="img"
            aria-label="Marked as favorite"
            title="Favorite"
          >
            ♥
          </span>
        )}
      </div>

      {/* ── Column 6: Review button — only when reviewText is present ── */}
      <div className="diary-row__review-col" role="cell" aria-label="Review">
        {hasReview && (
          <button
            type="button"
            className="diary-row__review-button"
            onClick={() => onOpenReview(entry.reviewText as string)}
            aria-label={`Open review for ${entry.title}`}
            title="View review"
          >
            {/* Speech bubble glyph */}
            <span aria-hidden="true">💬</span>
          </button>
        )}
      </div>

      {/* ── Column 7: Edit pencil — always present on every active row ── */}
      <div className="diary-row__edit-col" role="cell" aria-label="Edit entry">
        <button
          type="button"
          className="diary-row__edit-button"
          onClick={() => onEditEntry(entry.logId)}
          aria-label={`Edit log entry for ${entry.title}`}
          title="Edit entry"
        >
          {/* Pencil glyph */}
          <span aria-hidden="true">✎</span>
        </button>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UserDiary(): React.ReactElement {
  const { username } = useParams<{ username: string }>();

  if (!username) return <Navigate to="/home" replace />;

  // diaryLogs now comes from the shared DiaryContext — the exact same array
  // the Navbar's LogModal save handler writes into. This is what fixes the
  // sync bug: a new entry saved from any page's + LOG button now appears
  // here immediately, because both components read the identical state.
  const { diaryLogs, updateLogEntry } = useDiary();

  const tabs = buildProfileTabs(username);

  // ── Review modal state (read-only quote viewer) ───────────────────────────
  const [activeReviewText, setActiveReviewText] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen]         = useState<boolean>(false);

  // ── Edit modal state (full LogModal in edit mode) ─────────────────────────
  const [selectedLogToEdit, setSelectedLogToEdit] = useState<DiaryLogEntry | null>(null);
  const [isLogModalOpen, setIsLogModalOpen]       = useState<boolean>(false);

  // ── Review handlers ────────────────────────────────────────────────────────

  function handleOpenReview(reviewText: string): void {
    setActiveReviewText(reviewText);
    setIsReviewOpen(true);
  }

  function handleCloseReview(): void {
    setIsReviewOpen(false);
    setActiveReviewText(null);
  }

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function handleEditEntry(logId: string): void {
    const targetEntry = diaryLogs.find((log) => log.logId === logId);
    if (targetEntry) {
      setSelectedLogToEdit(targetEntry);
      setIsLogModalOpen(true);
    }
  }

  function handleCloseLogModal(): void {
    setIsLogModalOpen(false);
    setSelectedLogToEdit(null);
  }

  // Maps the LogModal's generic LogEntry shape back onto the specific
  // DiaryLogEntry being edited, then updates that one row in place via
  // the shared context's updateLogEntry — same array Navbar's LogModal
  // writes into, so this stays in sync everywhere too.
  function handleSaveEditedLog(updated: LogEntry): void {
    if (!selectedLogToEdit) return; // guard — shouldn't happen, modal only opens with a target

    updateLogEntry(selectedLogToEdit.logId, {
      seasonNumber: updated.season,
      dateLogged:   updated.watchedDate ?? selectedLogToEdit.dateLogged, // keep original date if cleared
      rating:       updated.rating,
      isFavorite:   updated.isLiked,
      reviewText:   updated.review.trim().length > 0 ? updated.review : undefined,
    });

    handleCloseLogModal();
  }

  // Builds the EditableLogEntry LogModal needs from the currently selected
  // DiaryLogEntry — narrows the richer diary shape down to the modal's
  // minimal contract.
  function toEditableLogEntry(entry: DiaryLogEntry): EditableLogEntry {
    return {
      showId:      entry.showId,
      title:       entry.title,
      posterUrl:   entry.posterUrl,
      season:      entry.seasonNumber,
      watchedDate: entry.dateLogged,
      review:      entry.reviewText ?? "",
      rating:      entry.rating,
      isLiked:     entry.isFavorite,
    };
  }

  return (
    <div className="user-diary-page">

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
      <header className="user-diary-page__header">
        <h1 className="user-diary-page__heading">Diary</h1>
      </header>

      {/* ════════════════════════════════════════════
          DIARY TABLE
      ════════════════════════════════════════════ */}
      {diaryLogs.length === 0 ? (
        <div className="diary-empty-state">
          <p className="diary-empty-state__heading">No diary entries yet</p>
          <p className="diary-empty-state__sub">
            Log an episode or season and it will show up here.
          </p>
        </div>
      ) : (
        <div
          className="diary-table"
          role="table"
          aria-label={`${diaryLogs.length} diary entries`}
        >
          {(() => {
            // Strict descending chronological sort — newest entries always
            // bubble to the top. Re-sorted on every render rather than
            // trusting the array's insertion order, since edits and new
            // saves can land anywhere in diaryLogs after a mutation.
            // [...diaryLogs] copies first so .sort() never mutates state
            // in place (mutating state directly is a React anti-pattern
            // that can cause subtle re-render bugs).
            const sortedLogs = [...diaryLogs].sort(
              (a, b) =>
                new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime()
            );

            return sortedLogs.map((entry, index) => {
              const previous = index > 0 ? sortedLogs[index - 1] : null;
              const isNewMonthGroup =
                previous === null ||
                monthYearKey(entry.dateLogged) !== monthYearKey(previous.dateLogged);

              return (
                <DiaryRow
                  key={entry.logId}
                  entry={entry}
                  showMonthBanner={isNewMonthGroup}
                  onOpenReview={handleOpenReview}
                  onEditEntry={handleEditEntry}
                />
              );
            });
          })()}
        </div>
      )}

      {/* ════════════════════════════════════════════
          REVIEW MODAL — read-only quote viewer
      ════════════════════════════════════════════ */}
      {isReviewOpen && activeReviewText && (
        <div
          className="diary-review-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Review"
          onClick={(e) => {
            // Close only when the backdrop itself is clicked, not the card
            if (e.target === e.currentTarget) handleCloseReview();
          }}
        >
          <div className="diary-review-modal">
            <div className="diary-review-modal__header">
              <div>
                <h2 className="diary-review-modal__title">Review</h2>
              </div>
              <button
                type="button"
                className="diary-review-modal__close-button"
                onClick={handleCloseReview}
                aria-label="Close review"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <p className="diary-review-modal__quote">{activeReviewText}</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          LOG MODAL — edit mode, pre-filled from selectedLogToEdit
      ════════════════════════════════════════════ */}
      {isLogModalOpen && selectedLogToEdit && (
        <LogModal
          onClose={handleCloseLogModal}
          onSave={handleSaveEditedLog}
          editingEntry={toEditableLogEntry(selectedLogToEdit)}
        />
      )}
    </div>
  );
}