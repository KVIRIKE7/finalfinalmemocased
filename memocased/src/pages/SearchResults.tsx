// ─────────────────────────────────────────────────────────────────────────────
// SearchResults Page  —  /search/:query
// Searches TMDB for TV shows matching the query, paginates results.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { searchShows } from "../services/tmdbApi";
import { getPosterUrl } from "../utils/tmdbImage";
import type { TMDBShowShort } from "../types/tmdb";
import "./SearchResults.css";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "done" };

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard(): React.ReactElement {
  return (
    <div className="search-card search-card--skeleton" aria-hidden="true">
      <div className="search-card__poster search-card__poster--skeleton" />
      <div className="search-card__body">
        <div className="search-card__skeleton-line search-card__skeleton-line--title" />
        <div className="search-card__skeleton-line search-card__skeleton-line--meta" />
        <div className="search-card__skeleton-line search-card__skeleton-line--overview" />
        <div className="search-card__skeleton-line search-card__skeleton-line--overview search-card__skeleton-line--short" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOW CARD
// ─────────────────────────────────────────────────────────────────────────────

function ShowCard({ show }: { show: TMDBShowShort }): React.ReactElement {
  const posterUrl = getPosterUrl(show.poster_path, "w185");
  const year      = show.first_air_date ? show.first_air_date.slice(0, 4) : null;
  const rating    = show.vote_average ? show.vote_average.toFixed(1) : null;

  return (
    <Link
      to={`/shows/${show.id}`}
      className="search-card"
      aria-label={`${show.name}${year ? `, ${year}` : ""}`}
    >
      <div className="search-card__poster">
        {posterUrl ? (
          <img
            className="search-card__poster-img"
            src={posterUrl}
            alt={`${show.name} poster`}
            loading="lazy"
          />
        ) : (
          <div className="search-card__poster-fallback" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
        )}
      </div>

      <div className="search-card__body">
        <h3 className="search-card__title">{show.name}</h3>

        <div className="search-card__meta">
          {year && <span className="search-card__year">{year}</span>}
          {rating && Number(rating) > 0 && (
            <span className="search-card__rating">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {rating}
            </span>
          )}
        </div>

        {show.overview && (
          <p className="search-card__overview">{show.overview}</p>
        )}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchResults(): React.ReactElement {
  const { query = "" }  = useParams<{ query: string }>();
  const navigate        = useNavigate();
  const decoded         = decodeURIComponent(query);

  const [shows,      setShows]      = useState<TMDBShowShort[]>([]);
  const [status,     setStatus]     = useState<Status>({ type: "idle" });
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRes,   setTotalRes]   = useState(0);

  // Inline search bar state (to refine without going back to navbar)
  const [inputVal, setInputVal]     = useState(decoded);
  const inputRef                    = useRef<HTMLInputElement>(null);

  // ── Fetch whenever query or page changes ────────────────────────────────
  useEffect(() => {
    if (!decoded.trim()) return;

    let cancelled = false;
    setStatus({ type: "loading" });
    if (page === 1) setShows([]);

    searchShows({ query: decoded, page })
      .then((res) => {
        if (cancelled) return;
        setShows((prev) => page === 1 ? res.results : [...prev, ...res.results]);
        setTotalPages(res.total_pages);
        setTotalRes(res.total_results);
        setStatus({ type: "done" });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStatus({ type: "error", message: err.message });
      });

    return () => { cancelled = true; };
  }, [decoded, page]);

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
    setInputVal(decoded);
  }, [decoded]);

  // ── Inline search submit ─────────────────────────────────────────────────
  function handleInlineSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputVal.trim();
    if (!q || q === decoded) return;
    navigate(`/search/${encodeURIComponent(q)}`);
  }

  const isLoading = status.type === "loading";

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="search-page">

      {/* ── Search bar ── */}
      <form className="search-page__bar" onSubmit={handleInlineSearch} role="search">
        <div className="search-page__bar-inner">
          <svg className="search-page__bar-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="search-page__bar-input"
            type="search"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search TV shows…"
            aria-label="Refine search"
            autoComplete="off"
            autoFocus
          />
          {inputVal && (
            <button
              type="button"
              className="search-page__bar-clear"
              onClick={() => { setInputVal(""); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <button className="search-page__bar-submit" type="submit">Search</button>
        </div>
      </form>

      {/* ── Header ── */}
      <div className="search-page__header">
        {isLoading && page === 1 ? (
          <p className="search-page__meta">Searching for <strong>"{decoded}"</strong>…</p>
        ) : status.type === "done" ? (
          <p className="search-page__meta">
            <strong>{totalRes.toLocaleString()}</strong> result{totalRes !== 1 ? "s" : ""} for <strong>"{decoded}"</strong>
          </p>
        ) : null}
      </div>

      {/* ── Error ── */}
      {status.type === "error" && (
        <div className="search-page__error" role="alert">
          <p>Something went wrong: {status.message}</p>
          <button className="search-page__retry" onClick={() => setPage(1)}>Try again</button>
        </div>
      )}

      {/* ── No results ── */}
      {status.type === "done" && shows.length === 0 && (
        <div className="search-page__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <path d="M8 11h6M11 8v6" opacity=".4"/>
          </svg>
          <p className="search-page__empty-title">No shows found</p>
          <p className="search-page__empty-sub">Try a different spelling or a broader search term.</p>
        </div>
      )}

      {/* ── Results grid ── */}
      <div className="search-results-grid" aria-label="Search results" aria-live="polite">
        {isLoading && page === 1
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          : shows.map((show) => <ShowCard key={show.id} show={show} />)
        }
      </div>

      {/* ── Load more ── */}
      {status.type === "done" && page < totalPages && (
        <div className="search-page__load-more-wrap">
          <button
            className="search-page__load-more"
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoading}
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {/* ── Loading more spinner ── */}
      {isLoading && page > 1 && (
        <div className="search-page__loading-more" aria-label="Loading more results">
          <span className="search-page__spinner" />
        </div>
      )}

    </div>
  );
}
