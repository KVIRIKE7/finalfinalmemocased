// ─────────────────────────────────────────────────────────────────────────────
// LogModal — Two-state modal: "search" → pick show, "details" → log entry
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { searchShows, getShowDetails } from "../services/tmdbApi";
import { getPosterUrl } from "../utils/tmdbImage";
import { useDebounce } from "../hooks/useDebounce";
import type {
  TMDBShowShort,
  TMDBShowDetail,
} from "../types/tmdb";
import type {
  LogEntry,
  LogModalState,
  SelectedShow,
  AutomatedLogData,
} from "../types/navbar";
import "./LogModal.css";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getReleaseYear(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return dateStr.slice(0, 4);
}

function todayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-types
// ─────────────────────────────────────────────────────────────────────────────

interface LogDetailsFields {
  season: string;
  addWatchedDate: boolean;
  watchedDate: string;
  review: string;
  rating: number;   // 0 = unrated, 1–5
  isLiked: boolean;
}

const INITIAL_DETAILS: LogDetailsFields = {
  season: "Season 1",
  addWatchedDate: false,
  watchedDate: todayISODate(),
  review: "",
  rating: 0,
  isLiked: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface LogModalProps {
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
  /**
   * When set, the modal skips Phase 1 (search) and opens directly in Phase 2
   * (details), pre-filled with the injected show data.
   * Pass `null` or omit the prop for the standard manual search flow.
   */
  automatedLogInjection?: AutomatedLogData | null;
  /**
   * When set, the modal opens directly in Phase 2 with every field
   * pre-populated from an existing diary entry (season, date, rating,
   * review, liked state). Used by the pencil "Edit" button on diary rows.
   * Mutually exclusive with automatedLogInjection — if both are somehow
   * passed, editingEntry takes priority.
   */
  editingEntry?: EditableLogEntry | null;
}

/**
 * Minimal shape LogModal needs to pre-fill an edit session. Any caller with
 * a richer entry type (e.g. DiaryLogEntry) can pass it directly — the extra
 * fields are simply ignored by the modal.
 */
export interface EditableLogEntry {
  showId: number;
  title: string;
  posterUrl: string | null;
  season: number;
  watchedDate: string | null; // "YYYY-MM-DD" or null if not tracked
  review: string;
  rating: number;              // 0–5
  isLiked: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// State A — Show Search
// ─────────────────────────────────────────────────────────────────────────────

interface SearchPanelProps {
  onSelect: (show: SelectedShow) => void;
  onClose: () => void;
}

function SearchPanel({ onSelect, onClose }: SearchPanelProps): React.ReactElement {
  const [query, setQuery]             = useState<string>("");
  const [results, setResults]         = useState<TMDBShowShort[]>([]);
  const [isLoading, setIsLoading]     = useState<boolean>(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const inputRef                      = useRef<HTMLInputElement>(null);
  const listRef                       = useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(query, 280);

  // Auto-focus the search input when panel mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch results whenever the debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setHighlighted(-1);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    searchShows({ query: debouncedQuery, page: 1 })
      .then((res) => {
        if (!cancelled) {
          setResults(res.results.slice(0, 8)); // cap at 8 dropdown items
          setHighlighted(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Keep highlighted item scrolled into view
  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLLIElement>("[data-result-item]");
    items[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function handleSelect(show: TMDBShowShort): void {
    onSelect({
      id:              show.id,
      title:           show.name,
      releaseYear:     getReleaseYear(show.first_air_date),
      posterPath:      show.poster_path,
      numberOfSeasons: 1, // will be overwritten after detail fetch in LogModal
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && results[highlighted]) {
        handleSelect(results[highlighted]);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="log-modal__search-panel">
      {/* ── Header ── */}
      <div className="log-modal__header">
        <h2 className="log-modal__header-title">Add to your shows...</h2>
        <button
          className="log-modal__close-button"
          onClick={onClose}
          aria-label="Close log modal"
          type="button"
        >
          {/* X icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Search Input ── */}
      <div className="log-modal__search-input-wrapper">
        <span className="log-modal__search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          ref={inputRef}
          className="log-modal__search-input"
          type="text"
          placeholder="Search for show..."
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search for a TV show"
          aria-autocomplete="list"
          aria-controls="log-modal-results"
          autoComplete="off"
        />
        {isLoading && (
          <span className="log-modal__search-spinner" aria-hidden="true" />
        )}
      </div>

      {/* ── Results Dropdown ── */}
      {results.length > 0 && (
        <ul
          id="log-modal-results"
          ref={listRef}
          className="log-modal__results-list"
          role="listbox"
          aria-label="Show search results"
        >
          {results.map((show, index) => (
            <li
              key={show.id}
              data-result-item
              className={[
                "log-modal__result-item",
                highlighted === index ? "log-modal__result-item--highlighted" : "",
              ].filter(Boolean).join(" ")}
              role="option"
              aria-selected={highlighted === index}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => handleSelect(show)}
            >
              <span className="log-modal__result-title">{show.name}</span>
              <span className="log-modal__result-year">
                ({getReleaseYear(show.first_air_date)})
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Empty state ── */}
      {debouncedQuery.trim() && !isLoading && results.length === 0 && (
        <p className="log-modal__no-results" role="status">
          No shows found for &ldquo;{debouncedQuery}&rdquo;
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Star Rating
// ─────────────────────────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;   // 0 = unrated
  onChange: (rating: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps): React.ReactElement {
  const [hovered, setHovered] = useState<number>(0);

  const display = hovered > 0 ? hovered : value;

  return (
    <div className="star-rating" role="group" aria-label="Rating out of 5 stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={[
            "star-rating__star",
            display >= star ? "star-rating__star--filled" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => onChange(star === value ? 0 : star)} // click same star to unrate
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          aria-pressed={value === star}
        >
          {/* Star SVG — fill toggled via class */}
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={display >= star ? "currentColor" : "none"}
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — Log Details
// ─────────────────────────────────────────────────────────────────────────────

interface DetailsPanelProps {
  show: SelectedShow;
  detail: TMDBShowDetail | null;
  onBack: () => void;
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
  /**
   * When injected from the Continue Watching row, pre-select this season
   * in the dropdown. Defaults to Season 1 for the manual search flow.
   * Ignored when initialFields is provided (edit mode takes priority).
   */
  initialSeason?: number;
  /**
   * Full pre-population for edit mode — every form field is seeded from
   * an existing diary entry rather than the INITIAL_DETAILS defaults.
   */
  initialFields?: LogDetailsFields;
  /**
   * When true, the Back button is hidden — there is no search phase to
   * return to because the modal was opened via automation or editing.
   */
  isAutomated?: boolean;
  /**
   * When true, the header reads "Edit log entry..." and the Save button
   * reads "Save Changes" instead of "Save".
   */
  isEditing?: boolean;
}

function DetailsPanel({
  show,
  detail,
  onBack,
  onClose,
  onSave,
  initialSeason = 1,
  initialFields,
  isAutomated = false,
  isEditing = false,
}: DetailsPanelProps): React.ReactElement {
  const [fields, setFields] = useState<LogDetailsFields>(
    initialFields ?? {
      ...INITIAL_DETAILS,
      // Pre-select the injected season (or Season 1 for manual flow)
      season: `Season ${initialSeason}`,
      // Auto-enable the watched date toggle for automated injections
      addWatchedDate: isAutomated,
    }
  );

  const posterUrl = getPosterUrl(show.posterPath, "w342");
  const seasonCount = detail?.number_of_seasons ?? show.numberOfSeasons;

  // Build season options from TMDB detail
  const seasonOptions: string[] = Array.from(
    { length: Math.max(seasonCount, 1) },
    (_, i) => `Season ${i + 1}`
  );

  function setField<K extends keyof LogDetailsFields>(
    key: K,
    value: LogDetailsFields[K]
  ): void {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(): void {
    // Enforce today's-date fallback: if the user never enabled the watched
    // date toggle, or the date field is somehow blank, fall back to today
    // rather than saving a null/empty date. Every log entry gets a real,
    // ISO-formatted date — required for the diary's chronological sort.
    const finalDate =
      (fields.addWatchedDate && fields.watchedDate.trim()) ||
      new Date().toISOString().split("T")[0];

    const entry: LogEntry = {
      showId:      show.id,
      title:       show.title,
      posterUrl:   posterUrl, // resolved above via getPosterUrl(show.posterPath, "w342")
      season:      parseInt(fields.season.replace("Season ", ""), 10),
      watchedDate: finalDate,
      review:      fields.review,
      rating:      fields.rating,
      isLiked:     fields.isLiked,
      timestamp:   new Date().toISOString(),
    };
    onSave(entry);
  }

  return (
    <div className="log-modal__details-panel">
      {/* ── Header ── */}
      <div className="log-modal__header">
        <div className="log-modal__header-left">
          {!isAutomated && (
            <button
              className="log-modal__back-button"
              type="button"
              onClick={onBack}
              aria-label="Back to show search"
            >
              {/* Left chevron */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              BACK
            </button>
          )}
          <h2 className="log-modal__header-title">
            {isEditing
              ? "Edit log entry"
              : isAutomated
                ? "Season complete! Log it..."
                : "I watched..."}
          </h2>
        </div>
        <button
          className="log-modal__close-button"
          type="button"
          onClick={onClose}
          aria-label="Close log modal"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="log-modal__details-body">
        {/* Left: Poster */}
        <div className="log-modal__poster-column">
          {posterUrl ? (
            <img
              className="log-modal__poster-image"
              src={posterUrl}
              alt={`${show.title} poster`}
            />
          ) : (
            <div className="log-modal__poster-placeholder" aria-label="No poster available">
              <span aria-hidden="true">📺</span>
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="log-modal__form-column">
          {/* Title & Year */}
          <div className="log-modal__show-meta">
            <p className="log-modal__show-title">{show.title}</p>
            <p className="log-modal__show-year">{show.releaseYear}</p>
          </div>

          {/* Season Dropdown */}
          <div className="log-modal__field-group">
            <label className="log-modal__label" htmlFor="log-season">
              Season
            </label>
            <select
              id="log-season"
              className="log-modal__select"
              value={fields.season}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField("season", e.target.value)
              }
            >
              {seasonOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Watched Date */}
          <div className="log-modal__field-group">
            <label className="log-modal__label log-modal__label--inline">
              <input
                className="log-modal__checkbox"
                type="checkbox"
                checked={fields.addWatchedDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setField("addWatchedDate", e.target.checked)
                }
                aria-label="Add watched date"
              />
              Watched on
            </label>
            {fields.addWatchedDate && (
              <input
                className="log-modal__date-input"
                type="date"
                value={fields.watchedDate}
                max={todayISODate()}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setField("watchedDate", e.target.value)
                }
                aria-label="Date watched"
              />
            )}
          </div>

          {/* Review Textarea */}
          <div className="log-modal__field-group">
            <label className="log-modal__label" htmlFor="log-review">
              Review
            </label>
            <textarea
              id="log-review"
              className="log-modal__textarea"
              placeholder="Add a review..."
              value={fields.review}
              rows={4}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setField("review", e.target.value)
              }
            />
          </div>

          {/* Rating & Like Row */}
          <div className="log-modal__rating-row">
            <StarRating
              value={fields.rating}
              onChange={(r) => setField("rating", r)}
            />

            {/* Like / Heart Button */}
            <button
              className={[
                "log-modal__like-button",
                fields.isLiked ? "log-modal__like-button--liked" : "",
              ].filter(Boolean).join(" ")}
              type="button"
              onClick={() => setField("isLiked", !fields.isLiked)}
              aria-label={fields.isLiked ? "Unlike this show" : "Like this show"}
              aria-pressed={fields.isLiked}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={fields.isLiked ? "currentColor" : "none"}
                />
              </svg>
            </button>
          </div>

          {/* Save Button */}
          <button
            className="log-modal__save-button"
            type="button"
            onClick={handleSave}
          >
            {isEditing ? "Save Changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LogModal — Root Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export function LogModal({
  onClose,
  onSave,
  automatedLogInjection = null,
  editingEntry = null,
}: LogModalProps): React.ReactElement {
  const [modalState, setModalState] = useState<LogModalState>({ step: "search", query: "" });
  const [showDetail, setShowDetail] = useState<TMDBShowDetail | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Edit-mode effect — runs once on mount if editingEntry is set ──────────
  // Takes priority over automatedLogInjection. Converts the existing diary
  // entry into a SelectedShow and jumps straight to "details", with every
  // field pre-populated from the entry being edited.
  useEffect(() => {
    if (!editingEntry) return;

    const injectedShow: SelectedShow = {
      id:              editingEntry.showId,
      title:           editingEntry.title,
      releaseYear:     "—",
      posterPath:      editingEntry.posterUrl,
      numberOfSeasons: editingEntry.season,
    };

    setModalState({ step: "details", selectedShow: injectedShow });

    // Background fetch to get the real season count for the dropdown —
    // non-fatal if it fails; the dropdown falls back to editingEntry.season.
    getShowDetails(editingEntry.showId)
      .then((detail) => {
        setShowDetail(detail);
        setModalState({
          step: "details",
          selectedShow: {
            ...injectedShow,
            numberOfSeasons: detail.number_of_seasons,
          },
        });
      })
      .catch(() => { /* keep editingEntry.season as the floor */ });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — editingEntry is read once on mount only

  // ── Injection effect — runs once on mount if automatedLogInjection is set ──
  // Skipped entirely when editingEntry is present (edit mode takes priority).
  useEffect(() => {
    if (editingEntry) return;       // edit mode wins — skip automation entirely
    if (!automatedLogInjection) return;

    const { showId, title, posterUrl, seasonToLog } = automatedLogInjection;

    // Build a SelectedShow from the injected data.
    // posterPath accepts a full URL here — getPosterUrl passes it through
    // unchanged when it's already a qualified URL.
    const injectedShow: SelectedShow = {
      id:              showId,
      title,
      releaseYear:     "—",         // not available from progress data
      posterPath:      posterUrl,   // full CDN URL, stored as posterPath
      numberOfSeasons: seasonToLog, // minimum — updated if detail fetch succeeds
    };

    setModalState({ step: "details", selectedShow: injectedShow });

    // Fire a background detail fetch to get the real season count.
    // Non-fatal: the dropdown falls back to seasonToLog if this fails.
    getShowDetails(showId)
      .then((detail) => {
        setShowDetail(detail);
        setModalState({
          step: "details",
          selectedShow: {
            ...injectedShow,
            numberOfSeasons: detail.number_of_seasons,
          },
        });
      })
      .catch(() => { /* keep injectedShow.numberOfSeasons as fallback */ });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — injection is read once on mount only

  // Trap focus & close on Escape
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (e.target === overlayRef.current) onClose();
  }

  const handleSelectShow = useCallback(async (partial: SelectedShow): Promise<void> => {
    // Immediately move to details with what we have from the search result
    setModalState({ step: "details", selectedShow: partial });
    setShowDetail(null);

    // Then fetch full detail to get real season count
    try {
      const detail = await getShowDetails(partial.id);
      setShowDetail(detail);
      // Update season count with accurate data
      setModalState({
        step: "details",
        selectedShow: {
          ...partial,
          numberOfSeasons: detail.number_of_seasons,
        },
      });
    } catch {
      // Non-fatal — season dropdown falls back to numberOfSeasons: 1
    }
  }, []);

  function handleBack(): void {
    setModalState({ step: "search", query: "" });
    setShowDetail(null);
  }

  return (
    <div
      ref={overlayRef}
      className="log-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Log a TV show"
      onClick={handleOverlayClick}
    >
      <div className="log-modal__container">
        {modalState.step === "search" && (
          <SearchPanel onSelect={handleSelectShow} onClose={onClose} />
        )}
        {modalState.step === "details" && (
          <DetailsPanel
            show={modalState.selectedShow}
            detail={showDetail}
            onBack={handleBack}
            onClose={onClose}
            onSave={onSave}
            initialSeason={automatedLogInjection?.seasonToLog ?? 1}
            initialFields={
              editingEntry
                ? {
                    season:         `Season ${editingEntry.season}`,
                    addWatchedDate: editingEntry.watchedDate !== null,
                    watchedDate:    editingEntry.watchedDate ?? todayISODate(),
                    review:         editingEntry.review,
                    rating:         editingEntry.rating,
                    isLiked:        editingEntry.isLiked,
                  }
                : undefined
            }
            isAutomated={editingEntry == null && automatedLogInjection != null}
            isEditing={editingEntry != null}
          />
        )}
      </div>
    </div>
  );
}