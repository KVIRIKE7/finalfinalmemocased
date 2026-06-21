// ─────────────────────────────────────────────────────────────────────────────
// ProfileShell
// Shared header + tab nav rendered on every /:username/* sub-page.
// Keeps the visual identical to UserProfile across Shows, Diary, Reviews,
// Watchlist, and Likes.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../../store/UserContext";
import "./ProfileShell.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileShellProps {
  username: string;
  children: React.ReactNode;
}

// ── Mock stats (replace with real context/store when available) ───────────────

const MOCK_STATS = {
  showsCompleted:   4,
  currentlyWatching: 3,
  dropped:          2,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}): React.ReactElement {
  if (avatarUrl) {
    return (
      <div className="profile-avatar profile-avatar--xl">
        <img className="profile-avatar__image" src={avatarUrl} alt={username} />
      </div>
    );
  }
  return (
    <div className="profile-avatar profile-avatar--xl" aria-label={username}>
      <span className="profile-avatar__initial" aria-hidden="true">
        {username.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function StatCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.ReactElement {
  return (
    <div className="profile-stat">
      <span className="profile-stat__value">{value}</span>
      <span className="profile-stat__label">{label}</span>
    </div>
  );
}

// ── ProfileShell ──────────────────────────────────────────────────────────────

export function ProfileShell({
  username,
  children,
}: ProfileShellProps): React.ReactElement {
  const { user: currentUser } = useUser();
  const isOwnProfile = currentUser?.username === username;

  const tabs = [
    { label: "Profile",   to: `/${username}` },
    { label: "Shows",     to: `/${username}/shows` },
    { label: "Diary",     to: `/${username}/diary` },
    { label: "Reviews",   to: `/${username}/reviews` },
    { label: "Watchlist", to: `/${username}/watchlist` },
    { label: "Likes",     to: `/${username}/likes` },
  ];

  return (
    <div className="profile-shell">

      {/* ── Header banner ── */}
      <header className="profile-header">
        <div className="profile-header__banner" aria-hidden="true" />

        <div className="profile-header__content">
          <div className="profile-header__identity">
            <ProfileAvatar
              username={username}
              avatarUrl={currentUser?.avatarUrl ?? null}
            />
            <div className="profile-header__name-group">
              <h1 className="profile-header__username">{username}</h1>
              {isOwnProfile && currentUser?.displayName && (
                <p className="profile-header__display-name">
                  {currentUser.displayName}
                </p>
              )}
            </div>
          </div>

          <div className="profile-header__stats" role="list" aria-label="Profile statistics">
            <div role="listitem">
              <StatCounter label="SHOWS COMPLETED"    value={MOCK_STATS.showsCompleted} />
            </div>
            <div className="profile-header__stats-divider" aria-hidden="true" />
            <div role="listitem">
              <StatCounter label="CURRENTLY WATCHING" value={MOCK_STATS.currentlyWatching} />
            </div>
            <div className="profile-header__stats-divider" aria-hidden="true" />
            <div role="listitem">
              <StatCounter label="DROPPED"            value={MOCK_STATS.dropped} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab nav ── */}
      <nav className="profile-tabs" aria-label="Profile sections">
        <ul className="profile-tabs__list" role="list">
          {tabs.map((tab) => (
            <li key={tab.to} className="profile-tabs__item" role="listitem">
              <NavLink
                to={tab.to}
                end
                className={({ isActive }) =>
                  ["profile-tabs__link", isActive ? "profile-tabs__link--active" : ""]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Page content ── */}
      <div className="profile-shell__body">
        {children}
      </div>

    </div>
  );
}
