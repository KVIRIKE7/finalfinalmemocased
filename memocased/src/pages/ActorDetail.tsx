// ─────────────────────────────────────────────────────────────────────────────
// ActorDetail Page  —  /actors/:actorId
// Foundational skeleton: live TMDB person fetch + two-column layout tree.
// No CSS/layout styling, no filter/sort tools, no share links yet.
//
// SECURITY NOTE — read before changing the fetch logic:
// The original spec for this page asked to embed a TMDB Bearer access
// token directly inside this component's fetch call. That is not done
// here, for the same reason it wasn't done on ShowDetail.tsx: a token
// hardcoded into client-side source ships straight into the browser's
// built JS bundle, readable by anyone via dev tools or the network tab.
// This project's existing pattern — reading the key from `import.meta.env`
// (populated from a local, gitignored `.env`, never committed) and
// calling TMDB via the public v3 `api_key` query-param scheme — is used
// instead. A new `getPersonDetails()` service function was added to
// `src/services/tmdbApi.ts` following the exact same shape as the
// existing `getShowDetails()`, and this component calls that instead of
// writing a second, less-safe fetch implementation.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getPersonDetails } from "../services/tmdbApi";
import { getProfileUrl, getPosterUrl } from "../utils/tmdbImage";
import type { TMDBPersonDetail } from "../types/tmdb";
import "./ActorDetail.css";

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIVE TMDB STATE INTERFACES
//
// The spec's TmdbShowCredit / TmdbActorProfile interfaces are exactly the
// shape TMDB's /person/{id} endpoint (with append_to_response=tv_credits)
// returns. That's already modeled as TMDBPersonTVCredit / TMDBPersonDetail
// in src/types/tmdb.ts — added alongside this page rather than declaring a
// second, narrower interface here that could silently drift from the real
// type. This component uses those directly and reads the fields it needs.
// ─────────────────────────────────────────────────────────────────────────────

type TmdbActorProfile = TMDBPersonDetail;

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPONENT — capture actorId, fetch live, hold state
// ─────────────────────────────────────────────────────────────────────────────

export default function ActorDetail(): React.ReactElement {
  const { actorId } = useParams<{ actorId: string }>();

  const [actorData, setActorData] = useState<TmdbActorProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // TMDB's /person/{person_id} endpoint requires a numeric person ID.
    const personId = Number(actorId);

    if (!actorId || Number.isNaN(personId)) {
      setActorData(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false; // guards against setting state after unmount

    setIsLoading(true);

    getPersonDetails(personId, ["tv_credits"])
      .then((data) => {
        if (!isCancelled) setActorData(data);
      })
      .catch(() => {
        // Network failure or 404 from TMDB — surfaced as "not found" below.
        if (!isCancelled) setActorData(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [actorId]);

  // ── 3a. Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return <div>Loading actor details...</div>;
  }

  // ── 3b. Error guard rail — fetch finished but no usable data ──────────────
  if (!actorData) {
    return (
      <div>
        <p>Actor not found at this location</p>
        <Link to="/shows">Back to Browsing</Link>
      </div>
    );
  }

  // ── 4. Two-column layout tree ──────────────────────────────────────────────
  const profileUrl = getProfileUrl(actorData.profile_path, "w500");

  // Deduplicate by show ID. TMDB's tv_credits.cast can legitimately contain
  // the same show more than once — a recurring or guest role split across
  // seasons sometimes produces multiple cast entries sharing the same `id`
  // but different `character`/`episode_count` values. Without this filter,
  // that show's poster would render twice in the gallery. Applied once here
  // where tvCredits is derived, rather than inline inside the JSX map, so
  // the render block stays a plain .map() and the dedup logic doesn't need
  // to re-run on every re-render of the list.
  const tvCredits = (() => {
    const seenShowIds = new Set<number>();
    return (actorData.tv_credits?.cast ?? []).filter((creditItem) => {
      if (seenShowIds.has(creditItem.id)) return false;
      seenShowIds.add(creditItem.id);
      return true;
    });
  })();

  return (
    <div className="actor-page-container">

      {/* ════════════════════════════════════════════
          LEFT COLUMN — name, subtitle, filmography list
      ════════════════════════════════════════════ */}
      <div className="actor-page-main">
        <p className="actor-page-label">SHOWS STARRING</p>
        <h1 className="actor-page-name">{actorData.name}</h1>

        <div className="actor-shows-grid">
          {tvCredits.map((creditItem) => {
            // "w300" is not a member of the PosterSize union (valid values:
            // w92 | w154 | w185 | w342 | w500 | w780 | original) — using it
            // failed to type-check against getPosterUrl's signature. w185 is
            // the correct fit here: this grid renders thumbnails as small as
            // ~130px wide (see .actor-shows-grid in ActorDetail.css), so w185
            // is sufficient resolution without over-fetching a larger image.
            const creditPosterUrl = getPosterUrl(creditItem.poster_path, "w185");
            return (
              <Link
                key={creditItem.id}
                to={`/shows/${creditItem.id}`}
                className="actor-shows-grid__item"
              >
                {/* Poster only — no title, no character name, no rating */}
                {creditPosterUrl && (
                  <img src={creditPosterUrl} alt={`${creditItem.name} poster`} />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT COLUMN — headshot + biography
      ════════════════════════════════════════════ */}
      <div className="actor-page-sidebar">
        {profileUrl && <img src={profileUrl} alt={`${actorData.name} headshot`} />}
        <p>{actorData.biography}</p>
      </div>

    </div>
  );
}