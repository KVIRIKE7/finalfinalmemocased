// ─────────────────────────────────────────────────────────────────────────────
// DiscoverShows Page  —  /shows
// Dual-column layout: collapsible filter sidebar + infinite-scroll results grid.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { Link } from "react-router-dom";
import { discoverShows } from "../services/tmdbApi";
import { getPosterUrl } from "../utils/tmdbImage";
import type { TMDBShowShort, TMDBSortOption } from "../types/tmdb";
import "./DiscoverShows.css";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface DiscoverFiltersState {
  sortBy: TMDBSortOption;
  withGenres: number[];     // array of selected TMDB genre IDs
  airDateGte: string;       // "YYYY-MM-DD" from-date  (maps to air_date.gte)
  airDateLte: string;       // "YYYY-MM-DD" to-date    (maps to air_date.lte)
  voteAverageGte: number;   // minimum rating (0–10)
  page: number;
}

// Discriminated union for the async fetch lifecycle
type FetchStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "appending" }   // loading more pages (existing results stay visible)
  | { status: "error"; message: string }
  | { status: "done"; hasMore: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: DiscoverFiltersState = {
  sortBy:        "popularity.desc",
  withGenres:    [],
  airDateGte:    "",
  airDateLte:    "",
  voteAverageGte: 0,
  page:          1,
};

// Standard TMDB TV genre list
const TMDB_TV_GENRES: { id: number; name: string }[] = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16,    name: "Animation" },
  { id: 35,    name: "Comedy" },
  { id: 80,    name: "Crime" },
  { id: 99,    name: "Documentary" },
  { id: 18,    name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648,  name: "Mystery" },
  { id: 10763, name: "News" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10766, name: "Soap" },
  { id: 10767, name: "Talk" },
  { id: 10768, name: "War & Politics" },
  { id: 37,    name: "Western" },
];

const SORT_OPTIONS: { value: TMDBSortOption; label: string }[] = [
  { value: "popularity.desc",     label: "Most Popular" },
  { value: "popularity.asc",      label: "Least Popular" },
  { value: "vote_average.desc",   label: "Highest Rated" },
  { value: "vote_average.asc",    label: "Lowest Rated" },
  { value: "first_air_date.desc", label: "Newest First" },
  { value: "first_air_date.asc",  label: "Oldest First" },
  { value: "name.asc",            label: "Name (A–Z)" },
  { value: "name.desc",           label: "Name (Z–A)" },
];

// Minimum vote count guard so high-rated obscure shows don't dominate
const MIN_VOTE_COUNT = 20;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Extracts a 4-digit year from a "YYYY-MM-DD" string, or returns "—". */
function formatYear(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr.length < 4) return "—";
  return dateStr.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Show Poster Card ─────────────────────────────────────────────────────────

interface ShowPosterCardProps {
  show: TMDBShowShort;
}

function ShowPosterCard({ show }: ShowPosterCardProps): React.ReactElement {
  const posterUrl = getPosterUrl(show.poster_path, "w342");

  return (
    <Link
      to={`/shows/${show.id}`}
      className="discover-card"
      aria-label={`${show.name} (${formatYear(show.first_air_date)})`}
    >
      {/* ── 2:3 Poster image ── */}
      <div className="discover-card__poster-wrapper">
        {posterUrl ? (
          <img
            className="discover-card__poster-image"
            src={posterUrl}
            alt={`${show.name} poster`}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="discover-card__poster-fallback" aria-hidden="true">
            <span className="discover-card__poster-fallback-icon">📺</span>
          </div>
        )}

        {/* Rating pill overlaid on poster */}
        {show.vote_average > 0 && (
          <div className="discover-card__rating" aria-label={`Rating: ${show.vote_average.toFixed(1)}`}>
            {show.vote_average.toFixed(1)}
          </div>
        )}
      </div>

      {/* ── Text below poster ── */}
      <div className="discover-card__meta">
        <p className="discover-card__title">{show.name}</p>
        <p className="discover-card__year">{formatYear(show.first_air_date)}</p>
      </div>
    </Link>
  );
}

// ── Sidebar: Sort Section ─────────────────────────────────────────────────────

interface SortSectionProps {
  value: TMDBSortOption;
  onChange: (value: TMDBSortOption) => void;
}

function SortSection({ value, onChange }: SortSectionProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  function handleChange(e: ChangeEvent<HTMLSelectElement>): void {
    onChange(e.currentTarget.value as TMDBSortOption);
  }

  return (
    <div className="sidebar__section">
      <button
        className="sidebar__section-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="sort-section-body"
      >
        <span className="sidebar__section-title">Sort By</span>
        <span
          className={`sidebar__section-caret ${isOpen ? "sidebar__section-caret--open" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div className="sidebar__section-body" id="sort-section-body">
          <select
            className="sidebar__select"
            value={value}
            onChange={handleChange}
            aria-label="Sort results by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Sidebar: Genre Filter Section ─────────────────────────────────────────────

interface GenreSectionProps {
  selected: number[];
  onToggle: (genreId: number) => void;
}

function GenreSection({ selected, onToggle }: GenreSectionProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div className="sidebar__section">
      <button
        className="sidebar__section-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="genre-section-body"
      >
        <span className="sidebar__section-title">Genres</span>
        <span
          className={`sidebar__section-caret ${isOpen ? "sidebar__section-caret--open" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div className="sidebar__section-body" id="genre-section-body">
          <div className="sidebar__genre-grid" role="group" aria-label="Genre filters">
            {TMDB_TV_GENRES.map((genre) => {
              const isSelected = selected.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  className={[
                    "sidebar__genre-badge",
                    isSelected ? "sidebar__genre-badge--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onToggle(genre.id)}
                  aria-pressed={isSelected}
                  aria-label={`${genre.name}${isSelected ? " (selected)" : ""}`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar: Rating Section ───────────────────────────────────────────────────

interface RatingSectionProps {
  value: number;
  onChange: (value: number) => void;
}

function RatingSection({ value, onChange }: RatingSectionProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    onChange(Number(e.currentTarget.value));
  }

  return (
    <div className="sidebar__section">
      <button
        className="sidebar__section-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="rating-section-body"
      >
        <span className="sidebar__section-title">Minimum Rating</span>
        <span
          className={`sidebar__section-caret ${isOpen ? "sidebar__section-caret--open" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div className="sidebar__section-body" id="rating-section-body">
          <div className="sidebar__rating-row">
            <input
              className="sidebar__range"
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={value}
              onChange={handleChange}
              aria-label={`Minimum rating: ${value}`}
              aria-valuemin={0}
              aria-valuemax={9}
              aria-valuenow={value}
            />
            <span className="sidebar__rating-value">
              {value === 0 ? "Any" : `${value}+`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar: Date Range Section ───────────────────────────────────────────────

interface DateSectionProps {
  airDateGte: string;
  airDateLte: string;
  onChangeGte: (value: string) => void;
  onChangeLte: (value: string) => void;
}

function DateSection({
  airDateGte,
  airDateLte,
  onChangeGte,
  onChangeLte,
}: DateSectionProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false); // collapsed by default

  return (
    <div className="sidebar__section">
      <button
        className="sidebar__section-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="date-section-body"
      >
        <span className="sidebar__section-title">Air Date Range</span>
        <span
          className={`sidebar__section-caret ${isOpen ? "sidebar__section-caret--open" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div className="sidebar__section-body" id="date-section-body">
          <div className="sidebar__date-group">
            <label className="sidebar__date-label" htmlFor="date-from">
              From
            </label>
            <input
              className="sidebar__date-input"
              id="date-from"
              type="date"
              value={airDateGte}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChangeGte(e.currentTarget.value)
              }
              max={airDateLte || undefined}
              aria-label="Air date from"
            />
          </div>
          <div className="sidebar__date-group">
            <label className="sidebar__date-label" htmlFor="date-to">
              To
            </label>
            <input
              className="sidebar__date-input"
              id="date-to"
              type="date"
              value={airDateLte}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChangeLte(e.currentTarget.value)
              }
              min={airDateGte || undefined}
              aria-label="Air date to"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DiscoverShows(): React.ReactElement {
  // ── Filter state (sidebar controls) ─────────────────────────────────────
  // "staged" filters — what the user has selected but not yet applied.
  // Applied on "Search" click, at which point they drive the next fetch.
  const [staged, setStaged] = useState<DiscoverFiltersState>(DEFAULT_FILTERS);

  // ── Results state ────────────────────────────────────────────────────────
  const [shows, setShows] = useState<TMDBShowShort[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ status: "idle" });

  // activeFilters drives the actual fetch — only updated on Search click
  // or Load More. Using a ref means we can read it inside fetch callbacks
  // without stale closure risk.
  const activeFiltersRef = useRef<DiscoverFiltersState>(DEFAULT_FILTERS);

  // ── Build TMDBDiscoverParams from the current active filters + page ──────

  function buildParams(filters: DiscoverFiltersState) {
    return {
      sort_by:            filters.sortBy,
      page:               filters.page,
      with_genres:        filters.withGenres.length > 0
                            ? filters.withGenres.join(",")
                            : undefined,
      "vote_average.gte": filters.voteAverageGte > 0
                            ? filters.voteAverageGte
                            : undefined,
      "vote_count.gte":   filters.voteAverageGte > 0 ? MIN_VOTE_COUNT : undefined,
      "air_date.gte":     filters.airDateGte || undefined,
      "air_date.lte":     filters.airDateLte || undefined,
    };
  }

  // ── Core fetch function ──────────────────────────────────────────────────

  const runFetch = useCallback(
    async (filters: DiscoverFiltersState, mode: "fresh" | "append"): Promise<void> => {
      setFetchStatus(mode === "fresh" ? { status: "loading" } : { status: "appending" });

      try {
        const response = await discoverShows(buildParams(filters));

        setShows((prev) =>
          mode === "fresh"
            ? response.results                     // replace — new search
            : [...prev, ...response.results]       // append — Load More
        );
        setTotalPages(response.total_pages);
        setFetchStatus({
          status: "done",
          hasMore: filters.page < response.total_pages,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load shows.";
        setFetchStatus({ status: "error", message });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Initial fetch on mount ───────────────────────────────────────────────

  useEffect(() => {
    void runFetch(DEFAULT_FILTERS, "fresh");
  }, [runFetch]);

  // ── Search button: apply staged filters, reset to page 1, fresh fetch ───

  function handleSearch(_e: MouseEvent<HTMLButtonElement>): void {
    const fresh: DiscoverFiltersState = { ...staged, page: 1 };
    activeFiltersRef.current = fresh;
    setStaged(fresh);          // keep staged in sync so page counter is accurate
    void runFetch(fresh, "fresh");
  }

  // ── Reset button: clear all filters and re-fetch ─────────────────────────

  function handleReset(_e: MouseEvent<HTMLButtonElement>): void {
    const reset = { ...DEFAULT_FILTERS };
    activeFiltersRef.current = reset;
    setStaged(reset);
    void runFetch(reset, "fresh");
  }

  // ── Load More: increment page, append results ────────────────────────────

  function handleLoadMore(_e: MouseEvent<HTMLButtonElement>): void {
    const nextPage = activeFiltersRef.current.page + 1;
    const updated: DiscoverFiltersState = {
      ...activeFiltersRef.current,
      page: nextPage,
    };
    activeFiltersRef.current = updated;
    setStaged((prev) => ({ ...prev, page: nextPage }));
    void runFetch(updated, "append");
  }

  // ── Staged filter mutators ───────────────────────────────────────────────

  function handleSortChange(value: TMDBSortOption): void {
    setStaged((prev) => ({ ...prev, sortBy: value }));
  }

  function handleGenreToggle(genreId: number): void {
    setStaged((prev) => ({
      ...prev,
      withGenres: prev.withGenres.includes(genreId)
        ? prev.withGenres.filter((id) => id !== genreId)
        : [...prev.withGenres, genreId],
    }));
  }

  function handleRatingChange(value: number): void {
    setStaged((prev) => ({ ...prev, voteAverageGte: value }));
  }

  function handleDateGteChange(value: string): void {
    setStaged((prev) => ({ ...prev, airDateGte: value }));
  }

  function handleDateLteChange(value: string): void {
    setStaged((prev) => ({ ...prev, airDateLte: value }));
  }

  // ── Derived booleans for render logic ────────────────────────────────────

  const isLoading   = fetchStatus.status === "loading";
  const isAppending = fetchStatus.status === "appending";
  const isError     = fetchStatus.status === "error";
  const hasMore     = fetchStatus.status === "done" && fetchStatus.hasMore;
  const isEmpty     = fetchStatus.status === "done" && shows.length === 0;
  const hasActiveFilters =
    staged.withGenres.length > 0 ||
    staged.voteAverageGte > 0    ||
    staged.airDateGte !== ""     ||
    staged.airDateLte !== "";

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="discover-page">

      {/* ── Page heading ── */}
      <header className="discover-page__header">
        <h1 className="discover-page__title">Discover Shows</h1>
        {hasActiveFilters && (
          <p className="discover-page__active-filter-count" aria-live="polite">
            {staged.withGenres.length > 0
              ? `${staged.withGenres.length} genre${staged.withGenres.length > 1 ? "s" : ""} selected`
              : ""}
          </p>
        )}
      </header>

      {/* ── Dual-column layout ── */}
      <div className="discover-page__body">

        {/* ════════════════════════════════════════════
            LEFT: FILTER SIDEBAR
        ════════════════════════════════════════════ */}
        <aside className="discover-sidebar" aria-label="Filter shows">

          {/* Sort */}
          <SortSection
            value={staged.sortBy}
            onChange={handleSortChange}
          />

          {/* Genre badges */}
          <GenreSection
            selected={staged.withGenres}
            onToggle={handleGenreToggle}
          />

          {/* Rating slider */}
          <RatingSection
            value={staged.voteAverageGte}
            onChange={handleRatingChange}
          />

          {/* Date range */}
          <DateSection
            airDateGte={staged.airDateGte}
            airDateLte={staged.airDateLte}
            onChangeGte={handleDateGteChange}
            onChangeLte={handleDateLteChange}
          />

          {/* ── Sidebar action row ── */}
          <div className="discover-sidebar__actions">
            <button
              className="discover-sidebar__search-button"
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? "Searching…" : "Search"}
            </button>

            {hasActiveFilters && (
              <button
                className="discover-sidebar__reset-button"
                type="button"
                onClick={handleReset}
                disabled={isLoading}
              >
                Reset
              </button>
            )}
          </div>
        </aside>

        {/* ════════════════════════════════════════════
            RIGHT: RESULTS GRID
        ════════════════════════════════════════════ */}
        <section
          className="discover-results"
          aria-label="Discovery results"
          aria-busy={isLoading}
        >

          {/* ── Loading skeleton grid ── */}
          {isLoading && (
            <div className="discover-results__grid" aria-label="Loading results">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="discover-card discover-card--skeleton"
                  aria-hidden="true"
                >
                  <div className="discover-card__poster-wrapper skeleton" />
                  <div className="discover-card__meta">
                    <div className="skeleton discover-card__skeleton-title" />
                    <div className="skeleton discover-card__skeleton-year" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Error state ── */}
          {isError && fetchStatus.status === "error" && (
            <div className="discover-results__error" role="alert">
              <p className="discover-results__error-message">
                {fetchStatus.message}
              </p>
              <button
                className="discover-results__retry-button"
                type="button"
                onClick={handleSearch}
              >
                Try again
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {isEmpty && (
            <div className="discover-results__empty">
              <p className="discover-results__empty-title">No shows found</p>
              <p className="discover-results__empty-sub">
                Try adjusting your filters or{" "}
                <button
                  className="discover-results__empty-reset"
                  type="button"
                  onClick={handleReset}
                >
                  reset to defaults
                </button>
                .
              </p>
            </div>
          )}

          {/* ── Results grid ── */}
          {!isLoading && shows.length > 0 && (
            <div
              className="discover-results__grid"
              role="list"
              aria-label={`${shows.length} shows found`}
            >
              {shows.map((show) => (
                <div
                  key={`discover-${show.id}`}
                  className="discover-results__grid-item"
                  role="listitem"
                >
                  <ShowPosterCard show={show} />
                </div>
              ))}
            </div>
          )}

          {/* ── Appending spinner (Load More in progress) ── */}
          {isAppending && (
            <div className="discover-results__append-loader" aria-label="Loading more shows">
              <span className="page-loader__spinner" aria-hidden="true" />
            </div>
          )}

          {/* ── Load More button ── */}
          {hasMore && !isAppending && (
            <div className="discover-results__load-more-wrapper">
              <button
                className="discover-results__load-more-button"
                type="button"
                onClick={handleLoadMore}
                aria-label={`Load more shows (page ${activeFiltersRef.current.page + 1} of ${totalPages})`}
              >
                Load More
              </button>
            </div>
          )}

          {/* ── End of results message ── */}
          {fetchStatus.status === "done" && !hasMore && shows.length > 0 && (
            <p className="discover-results__end-label" aria-live="polite">
              All {shows.length} results loaded
            </p>
          )}

        </section>
      </div>
    </div>
  );
}