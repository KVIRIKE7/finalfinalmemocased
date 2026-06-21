// ─────────────────────────────────────────────────────────────────────────────
// Router — Memocased
// Uses React Router v6 createBrowserRouter + lazy loading for all pages.
// ─────────────────────────────────────────────────────────────────────────────

import React, { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";

// ── Lazy Page Imports ─────────────────────────────────────────────────────────

const SignIn              = lazy(() => import("./pages/SignIn"));
const SignUp              = lazy(() => import("./pages/SignUp"));
const Home                = lazy(() => import("./pages/Home"));
const DiscoverShows       = lazy(() => import("./pages/DiscoverShows"));
const ShowDetail          = lazy(() => import("./pages/ShowDetail"));
const ActorDetail         = lazy(() => import("./pages/ActorDetail"));
const UserProfile         = lazy(() => import("./pages/UserProfile"));
const UserShowsProgress   = lazy(() => import("./pages/UserShowsProgress"));
const UserDiary           = lazy(() => import("./pages/UserDiary"));
const UserReviews         = lazy(() => import("./pages/UserReviews"));
const UserWatchlist       = lazy(() => import("./pages/UserWatchlist"));
const UserLikes           = lazy(() => import("./pages/UserLikes"));

// ── Loading Fallback ──────────────────────────────────────────────────────────

function PageLoader(): React.ReactElement {
  return (
    <div className="page-loader" role="status" aria-label="Loading page…">
      <span className="page-loader__spinner" aria-hidden="true" />
    </div>
  );
}

// ── Auth route wrapper (no Navbar) ────────────────────────────────────────────

function AuthRoutes(): React.ReactElement {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

// ── Router Definition ─────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // ── Auth routes (no Navbar) ───────────────────────────────────────────────
  {
    path: "/auth",
    element: <AuthRoutes />,
    children: [
      { index: true, element: <Navigate to="/auth/signin" replace /> },
      { path: "signin", element: <SignIn /> },
      { path: "signup", element: <SignUp /> },
    ],
  },

  // ── Authenticated app routes (Navbar via AppLayout) ───────────────────────
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <AppLayout />
      </Suspense>
    ),
    children: [
      { path: "/home",                      element: <Home /> },
      { path: "/shows",                     element: <DiscoverShows /> },
      // /shows/:showSlug MUST precede /:username — otherwise "shows" is
      // captured as a username and ShowDetail never renders.
      { path: "/shows/:showSlug",           element: <ShowDetail /> },
      { path: "/actors/:actorId",           element: <ActorDetail /> },
      { path: "/:username",                 element: <UserProfile /> },
      { path: "/:username/shows",           element: <UserShowsProgress /> },
      { path: "/:username/diary",           element: <UserDiary /> },
      { path: "/:username/reviews",         element: <UserReviews /> },
      { path: "/:username/watchlist",       element: <UserWatchlist /> },
      { path: "/:username/likes",           element: <UserLikes /> },
      // Future pages:
      // { path: "/settings",                element: <Settings /> },
    ],
  },

  // ── Root redirect ─────────────────────────────────────────────────────────
  { path: "/",  element: <Navigate to="/auth/signin" replace /> },
  { path: "*",  element: <Navigate to="/auth/signin" replace /> },
]);

// ── App Router Provider ───────────────────────────────────────────────────────

export function AppRouter(): React.ReactElement {
  return <RouterProvider router={router} />;
}