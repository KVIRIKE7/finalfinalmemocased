// ─────────────────────────────────────────────────────────────────────────────
// Navbar & Auth Types
// Single source of truth for all types consumed by:
//   Navbar.tsx · LogModal.tsx · UserContext.tsx
// ─────────────────────────────────────────────────────────────────────────────

// ── Navigation Links ──────────────────────────────────────────────────────────

/** A single entry in either the primary nav or the profile dropdown menu. */
export interface NavLinkItem {
  label: string;
  to: string;
}

// ── Authenticated User ────────────────────────────────────────────────────────

/**
 * The shape of a signed-in user.
 * Stored in UserContext and read by Navbar, ProfileDropdown, and route guards.
 */
export interface AuthUser {
  /** Opaque user ID from your auth backend */
  id: string;
  /** Unique handle used in profile URLs, e.g. "/KVIRO7" */
  username: string;
  /** Display name shown in the dropdown header */
  displayName: string;
  /** Absolute URL or relative path to avatar. Null = show initials fallback. */
  avatarUrl: string | null;
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────

export interface ProfileDropdownProps {
  user: AuthUser;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Modal Types
// Used by LogModal.tsx, exported here so Navbar.tsx can reference LogEntry
// in its handleLogSave callback without importing from LogModal directly.
// ─────────────────────────────────────────────────────────────────────────────

// ── Selected Show ─────────────────────────────────────────────────────────────

/**
 * Minimal show shape passed from SearchPanel → DetailsPanel.
 * Populated from TMDBShowShort; numberOfSeasons is refined after the
 * detail fetch resolves.
 */
export interface SelectedShow {
  id: number;
  title: string;
  releaseYear: string;
  posterPath: string | null;
  numberOfSeasons: number;
}

// ── Log Modal State Machine ───────────────────────────────────────────────────

/**
 * Discriminated union governing which panel LogModal renders.
 *
 *  step: "search"  — user is typing a show name
 *  step: "details" — user has picked a show and is filling in log fields
 */
export type LogModalState =
  | {
      step: "search";
      /** Preserved so the input doesn't reset if the user navigates back */
      query: string;
    }
  | {
      step: "details";
      selectedShow: SelectedShow;
    };

// ── Automated Log Injection ───────────────────────────────────────────────────

/**
 * Passed to LogModal when a season-finale checkmark is clicked from the
 * Continue Watching row. Skips Phase 1 (search) and pre-fills Phase 2.
 *
 * posterUrl is a fully-qualified CDN URL (not a TMDB path) because
 * Home.tsx holds URLs, not raw paths. LogModal stores it in SelectedShow
 * as posterPath — the field is null-safe so a URL here works fine.
 */
export interface AutomatedLogData {
  showId: number;
  title: string;
  posterUrl: string;   // fully-qualified URL (e.g. https://image.tmdb.org/...)
  seasonToLog: number; // the season that was just completed
}

// ── Log Entry ─────────────────────────────────────────────────────────────────

/**
 * The completed, saveable record produced when the user clicks "Save"
 * in the DetailsPanel. This is what gets handed off to your data layer.
 */
export interface LogEntry {
  /** TMDB series ID */
  showId: number;
  /** Show name at the time of logging (denormalised for display convenience) */
  title: string;
  /**
   * Fully-qualified poster image URL, denormalised at save time so the
   * diary timeline can render a thumbnail without a second TMDB lookup.
   * Null when no poster was available for the selected show.
   */
  posterUrl: string | null;
  /** 1-based season number selected by the user */
  season: number;
  /**
   * ISO 8601 date string ("YYYY-MM-DD") if the user enabled the watched-date
   * toggle, otherwise null.
   */
  watchedDate: string | null;
  /** Free-text review; empty string if none entered */
  review: string;
  /** Star rating 1–5; 0 = unrated */
  rating: number;
  /** Whether the user pressed the heart / liked this show */
  isLiked: boolean;
  /** ISO 8601 timestamp of when the entry was created */
  timestamp: string;
}