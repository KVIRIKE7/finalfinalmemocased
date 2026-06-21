// ─────────────────────────────────────────────────────────────────────────────
// AuthLayout
// Shared split-screen shell for Sign In and Sign Up pages.
// Left: dynamic TMDB backdrop (60%, desktop only).
// Right: form panel (40% desktop / 100% mobile).
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Link } from "react-router-dom";
import { useAuthBackdrop } from "../../hooks/useAuthBackdrop";
import "./Auth.css"

// ── Props ─────────────────────────────────────────────────────────────────────

interface AuthLayoutProps {
  /** The form content rendered inside the right panel */
  children: React.ReactNode;
  /** Link destination for the toggle button */
  toggleHref: "/auth/signin" | "/auth/signup";
  /** Label shown on the toggle button */
  toggleLabel: "Sign In" | "Join Now";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuthLayout({
  children,
  toggleHref,
  toggleLabel,
}: AuthLayoutProps): React.ReactElement {
  const backdropState = useAuthBackdrop();

  // Resolve backdrop values for the left panel
  const backdropImageUrl =
    backdropState.status === "ready" ? backdropState.backdrop.imageUrl : null;
  const backdropAltText =
    backdropState.status === "ready"
      ? `Backdrop from ${backdropState.backdrop.showName}`
      : "TV show backdrop";

  return (
    <div className="auth-layout">
      {/* ── Left Panel: Dynamic Backdrop ─────────────────────────────────── */}
      <section
        className="auth-layout__backdrop"
        aria-label={backdropAltText}
        aria-hidden="true" // decorative — screen readers skip this panel
      >
        {/* Background image layer */}
        {backdropImageUrl && (
          <img
            className="auth-layout__backdrop-image"
            src={backdropImageUrl}
            alt={backdropAltText}
            // No lazy loading — this IS the page's hero visual
          />
        )}

        {/* Skeleton shimmer while loading */}
        {backdropState.status === "loading" && (
          <div
            className="auth-layout__backdrop-skeleton"
            role="status"
            aria-label="Loading backdrop image"
          />
        )}

        {/* Gradient overlay — ensures right-panel edge reads clearly */}
        <div className="auth-layout__backdrop-overlay" />

        {/* Attribution: show name watermark at the bottom */}
        {backdropState.status === "ready" && (
          <p className="auth-layout__backdrop-attribution">
            <span className="auth-layout__backdrop-attribution-label">
              Now featured:
            </span>{" "}
            {backdropState.backdrop.showName}
          </p>
        )}
      </section>

      {/* ── Right Panel: Form Container ──────────────────────────────────── */}
      <section className="auth-layout__panel" aria-label="Authentication panel">
        {/* ── Panel Header ─────────────────────────────────────────────── */}
        <header className="auth-layout__panel-header">
          {/* Logo */}
          <Link
            to="/"
            className="auth-layout__logo-link"
            aria-label="Memocased — go to homepage"
          >
            {/*
             * Replace this placeholder with your actual logo asset once it
             * exists at src/assets/logo.(svg|png|webp).
             *
             * Example:
             *   import LogoSvg from "@/assets/logo.svg?react";
             *   <LogoSvg className="auth-layout__logo" aria-hidden="true" />
             *
             * The text fallback below keeps things functional in the interim.
             */}
            <span className="auth-layout__logo-wordmark">Memocased</span>
          </Link>

          {/* Toggle button — "Join Now" on SignIn, "Sign In" on SignUp */}
          <Link
            to={toggleHref}
            className="auth-layout__toggle-button"
            aria-label={`${toggleLabel} — switch auth mode`}
          >
            {toggleLabel}
          </Link>
        </header>

        {/* ── Form Slot ────────────────────────────────────────────────── */}
        <main className="auth-layout__panel-main">{children}</main>
      </section>
    </div>
  );
}