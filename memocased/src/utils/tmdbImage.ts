// ─────────────────────────────────────────────────────────────────────────────
// TMDB Image URL Helpers
// Centralises all image CDN logic so components never hardcode paths.
// ─────────────────────────────────────────────────────────────────────────────

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// ── Size Enums ────────────────────────────────────────────────────────────────

/** Poster image widths supported by TMDB CDN */
export type PosterSize =
  | "w92"
  | "w154"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "original";

/** Backdrop image widths supported by TMDB CDN */
export type BackdropSize = "w300" | "w780" | "w1280" | "original";

/** Profile (cast/crew) image widths supported by TMDB CDN */
export type ProfileSize = "w45" | "w185" | "w500" | "h632" | "original";

/** Still (episode) image widths supported by TMDB CDN */
export type StillSize = "w92" | "w185" | "w300" | "original";

/** Logo image widths supported by TMDB CDN */
export type LogoSize =
  | "w45"
  | "w92"
  | "w154"
  | "w185"
  | "w300"
  | "w500"
  | "original";

// ── Builders ─────────────────────────────────────────────────────────────────

export function getPosterUrl(
  posterPath: string | null,
  size: PosterSize = "w342"
): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export function getBackdropUrl(
  backdropPath: string | null,
  size: BackdropSize = "w1280"
): string | null {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

export function getProfileUrl(
  profilePath: string | null,
  size: ProfileSize = "w185"
): string | null {
  if (!profilePath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${profilePath}`;
}

export function getStillUrl(
  stillPath: string | null,
  size: StillSize = "w300"
): string | null {
  if (!stillPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${stillPath}`;
}

export function getLogoUrl(
  logoPath: string | null,
  size: LogoSize = "w185"
): string | null {
  if (!logoPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${logoPath}`;
}