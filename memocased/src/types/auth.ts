// ─────────────────────────────────────────────────────────────────────────────
// Auth Types
// Covers form state, submission payloads, and the backdrop data shape used
// by the shared AuthLayout component.
// ─────────────────────────────────────────────────────────────────────────────

// ── Sign In ───────────────────────────────────────────────────────────────────

export interface SignInFormFields {
  identifier: string; // email or username
  password: string;
}

export interface SignInFormErrors {
  identifier?: string;
  password?: string;
  form?: string; // top-level / server error
}

// ── Sign Up ───────────────────────────────────────────────────────────────────

export interface SignUpFormFields {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignUpFormErrors {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

// ── Shared Auth Layout ────────────────────────────────────────────────────────

/**
 * The resolved backdrop shown on the left panel.
 * Derived from a TMDBShowShort after a random pick.
 */
export interface AuthBackdrop {
  imageUrl: string;   // fully-qualified TMDB image CDN URL
  showName: string;   // for the aria-label / alt text
  showId: number;
}

export type AuthBackdropState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; backdrop: AuthBackdrop }
  | { status: "error" };