// ─────────────────────────────────────────────────────────────────────────────
// AppLayout
// Root layout shell for all authenticated pages.
// Renders <Navbar> at the top, then the matched page via <Outlet>.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../../components/layout/Navbar";

export function AppLayout(): React.ReactElement {
  return (
    <div className="app-layout">
      <Navbar />

      {/*
       * Skip-navigation link — renders off-screen but focusable via keyboard.
       * Allows screen reader and keyboard users to jump past the navbar.
       * Target the `id` of your main content area below.
       */}
      <a className="skip-nav-link" href="#main-content">
        Skip to main content
      </a>

      <main
        className="app-layout__content"
        id="main-content"
        // Receives focus from the skip link above
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  );
}