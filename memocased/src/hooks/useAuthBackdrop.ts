// ─────────────────────────────────────────────────────────────────────────────
// useAuthBackdrop
// Fetches popular OR trending TV shows (randomly chosen), picks one show at
// random, and resolves its full backdrop URL. Used exclusively by AuthLayout.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { getPopularShows, getTrendingShows } from "../services/tmdbApi";
import { getBackdropUrl } from "../utils/tmdbImage";
import type { AuthBackdropState } from "../types/auth";
import type { TMDBShowShort } from "../types/tmdb";

// TMDB image CDN — w1280 gives a sharp full-height panel on retina displays.
const BACKDROP_SIZE = "w1280" as const;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * On every mount, randomly decides between popular and trending shows,
 * fetches the list, picks one show that has a backdrop, and returns
 * the fully-qualified image URL along with the show name.
 *
 * @returns AuthBackdropState — a discriminated union the component can
 *   switch on: 'idle' | 'loading' | 'ready' | 'error'
 */
export function useAuthBackdrop(): AuthBackdropState {
  const [state, setState] = useState<AuthBackdropState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function fetchBackdrop(): Promise<void> {
      setState({ status: "loading" });

      try {
        // Randomly pick between popular and trending on every mount
        const useTrending = Math.random() < 0.5;
        const response = useTrending
          ? await getTrendingShows("week")
          : await getPopularShows(1);

        if (cancelled) return;

        // Filter to shows that actually have a backdrop image
        const withBackdrops: TMDBShowShort[] = response.results.filter(
          (show): show is TMDBShowShort & { backdrop_path: string } =>
            show.backdrop_path !== null && show.backdrop_path.length > 0
        );

        if (withBackdrops.length === 0) {
          setState({ status: "error" });
          return;
        }

        const picked = pickRandom(withBackdrops);
        const imageUrl = getBackdropUrl(picked.backdrop_path, BACKDROP_SIZE);

        if (!imageUrl) {
          setState({ status: "error" });
          return;
        }

        setState({
          status: "ready",
          backdrop: {
            imageUrl,
            showName: picked.name,
            showId: picked.id,
          },
        });
      } catch {
        if (!cancelled) {
          setState({ status: "error" });
        }
      }
    }

    void fetchBackdrop();

    return () => {
      cancelled = true;
    };
  }, []); // empty deps — intentional: fetch once on mount, new image on refresh

  return state;
}