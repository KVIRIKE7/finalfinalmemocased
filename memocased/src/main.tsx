// ─────────────────────────────────────────────────────────────────────────────
// main.tsx — Application entry point
// Mounts React into #root, wraps everything in global providers.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { UserProvider } from "./store/UserContext";
import { DiaryProvider } from "./store/DiaryContext";
import { WatchlistProvider } from "./store/WatchlistContext";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "[Memocased] Could not find #root element. Check your index.html."
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/*
     * UserProvider — makes the signed-in user available to any component
     * via the `useUser()` hook. Must sit above AppRouter so the Navbar
     * and any route guard can read auth state.
     *
     * DiaryProvider — shared diaryLogs source of truth. Must also sit
     * above AppRouter: the Navbar's global LogModal (which can save a
     * new entry from any page) and the UserDiary page (which displays
     * the timeline) are siblings in the route tree, not parent/child —
     * neither can hold this state itself without the other losing sync.
     *
     * WatchlistProvider — shared watchlist / currentlyWatching source of
     * truth. Same reasoning: UserWatchlist's "Start Watching" action moves
     * a show into currentlyWatching, which other pages may eventually
     * read (e.g. a future Home.tsx integration) — that only works if
     * everyone shares this one array pair.
     */}
    <UserProvider>
      <DiaryProvider>
        <WatchlistProvider>
          <App />
        </WatchlistProvider>
      </DiaryProvider>
    </UserProvider>
  </React.StrictMode>
);