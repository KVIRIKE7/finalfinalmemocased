// ─────────────────────────────────────────────────────────────────────────────
// Navbar — Global app header
// Logo | SHOWS nav | Search toggle | +LOG button | Profile dropdown
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../store/UserContext";
import { useDiary } from "../../store/DiaryContext";
import { LogModal } from "../../components/LogModal";
import type { LogEntry } from "../../types/navbar";
import "./Navbar.css";

// ─────────────────────────────────────────────────────────────────────────────
// Profile Dropdown
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps): React.ReactElement | null {
  const { user, signOut } = useUser();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const username = user.username;

  function handleSignOut(): void {
    signOut();
    onClose();
    navigate("/auth/signin");
  }

  interface DropdownLink {
    label: string;
    href: string;
  }

  const links: DropdownLink[] = [
    { label: "Home",      href: "/home" },
    { label: "Profile",   href: `/${username}` },
    { label: "Shows",     href: `/${username}/shows` },
    { label: "Diary",     href: `/${username}/diary` },
    { label: "Reviews",   href: `/${username}/reviews` },
    { label: "Watchlist", href: `/${username}/watchlist` },
    { label: "Settings",  href: "/settings" },
  ];

  return (
    <div
      ref={dropdownRef}
      className="navbar__profile-dropdown"
      role="menu"
      aria-label="Profile menu"
    >
      {/* User info header */}
      <div className="navbar__profile-dropdown-header">
        <p className="navbar__profile-dropdown-name">{user.displayName}</p>
        <p className="navbar__profile-dropdown-username">@{username}</p>
      </div>

      <div className="navbar__profile-dropdown-divider" role="separator" />

      {/* Navigation links */}
      {links.map(({ label, href }) => (
        <Link
          key={href}
          to={href}
          className="navbar__profile-dropdown-item"
          role="menuitem"
          onClick={onClose}
        >
          {label}
        </Link>
      ))}

      <div className="navbar__profile-dropdown-divider" role="separator" />

      {/* Sign Out */}
      <button
        className="navbar__profile-dropdown-item navbar__profile-dropdown-item--signout"
        role="menuitem"
        type="button"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar / PFP
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarProps {
  displayName: string;
  avatarUrl: string | null;
}

function Avatar({ displayName, avatarUrl }: AvatarProps): React.ReactElement {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        className="navbar__avatar-image"
        src={avatarUrl}
        alt={displayName}
      />
    );
  }

  return (
    <div className="navbar__avatar-initials" aria-hidden="true">
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────────────────────

export function Navbar(): React.ReactElement {
  const { user } = useUser();
  const { addLogEntry } = useDiary();
  const navigate = useNavigate();

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery]   = useState<string>("");
  const searchInputRef                  = useRef<HTMLInputElement>(null);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Log modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);

  // Focus the search input whenever it opens
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  // ── Search handlers ────────────────────────────────────────────────────────

  function openSearch(): void {
    setIsSearchOpen(true);
  }

  function closeSearch(): void {
    setIsSearchOpen(false);
    setSearchQuery("");
  }

  function executeSearch(): void {
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search/${encodeURIComponent(q)}`);
    closeSearch();
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") executeSearch();
    if (e.key === "Escape") closeSearch();
  }

  // ── Log modal handlers ──────────────────────────────────────────────────────

  const handleLogSave = useCallback((entry: LogEntry): void => {
    // Writes into the shared diaryLogs source of truth (DiaryContext).
    // Any component reading useDiary().diaryLogs — including the
    // UserDiary page — re-renders immediately with the new entry.
    addLogEntry(entry);
    setIsLogModalOpen(false);
  }, [addLogEntry]);

  const handleCloseModal = useCallback((): void => {
    setIsLogModalOpen(false);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar__inner">

          {/* ── Left: Logo ── */}
          <div className="navbar__left">
            <Link to="/home" className="navbar__logo" aria-label="Memocased home">
              <span className="navbar__logo-wordmark">Memocased</span>
            </Link>

            {/* Primary nav links */}
            <ul className="navbar__nav-links" role="list">
              <li>
                <Link to="/shows" className="navbar__nav-link">
                  SHOWS
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Right: Actions ── */}
          <div className="navbar__right">

            {/* Search toggle icon — always visible */}
            <button
              className={[
                "navbar__icon-button",
                isSearchOpen ? "navbar__icon-button--active" : "",
              ].filter(Boolean).join(" ")}
              type="button"
              onClick={isSearchOpen ? closeSearch : openSearch}
              aria-label={isSearchOpen ? "Close search" : "Open search"}
              aria-expanded={isSearchOpen}
            >
              {isSearchOpen ? (
                /* X / Close icon */
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                /* Magnifying glass icon */
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            {/* Search input field — replaces +LOG when open */}
            {isSearchOpen ? (
              <div className="navbar__search-field" role="search">
                <span className="navbar__search-field-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  ref={searchInputRef}
                  className="navbar__search-input"
                  type="search"
                  placeholder="Search shows..."
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Search TV shows"
                  autoComplete="off"
                />
                {/* Inline submit button inside the field */}
                <button
                  className="navbar__search-submit"
                  type="button"
                  onClick={executeSearch}
                  aria-label="Submit search"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              /* +LOG button — only shown when search is closed */
              <button
                className="navbar__log-button"
                type="button"
                onClick={() => setIsLogModalOpen(true)}
                aria-label="Log a TV show"
              >
                + LOG
              </button>
            )}

            {/* Profile PFP + Username combo — only when logged in */}
            {user && (
              <div className="navbar__profile-wrapper">
                <button
                  className="navbar__profile-trigger"
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="menu"
                  aria-label={`Profile menu for ${user.displayName}`}
                >
                  <Avatar
                    displayName={user.displayName}
                    avatarUrl={user.avatarUrl}
                  />
                  <span className="navbar__profile-username">{user.username}</span>
                  {/* Caret */}
                  <svg
                    className={[
                      "navbar__profile-caret",
                      isDropdownOpen ? "navbar__profile-caret--open" : "",
                    ].filter(Boolean).join(" ")}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <ProfileDropdown
                  isOpen={isDropdownOpen}
                  onClose={() => setIsDropdownOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Log Modal — rendered in the Navbar so it's accessible from anywhere */}
      {isLogModalOpen && (
        <LogModal
          onClose={handleCloseModal}
          onSave={handleLogSave}
        />
      )}
    </>
  );
}