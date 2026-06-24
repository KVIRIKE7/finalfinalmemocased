// ─────────────────────────────────────────────────────────────────────────────
// UserProfile Page  —  /:username
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, NavLink, Navigate } from "react-router-dom";
import { getPosterUrl } from "../utils/tmdbImage";
import { useUser } from "../store/UserContext";
import { useDiary } from "../store/DiaryContext";
import { useWatchlist } from "../store/WatchlistContext";
import { fetchFavorites, upsertFavorite } from "../services/watchlistService";
import { searchShows } from "../services/tmdbApi";
import { useDroppedCount } from "../hooks/useDroppedCount";
import "./UserProfile.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FavoriteShow {
  showId:      number;
  title:       string;
  posterPath:  string | null;
  releaseYear: string;
  position:    number;
}

interface ProfileStats {
  showsCompleted:    number;
  currentlyWatching: number;
  dropped:           number;
}

interface ProfileTab {
  label: string;
  to:    string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileAvatar({ username, avatarUrl, size = "xl" }: {
  username: string; avatarUrl: string | null; size?: "lg" | "xl";
}): React.ReactElement {
  return (
    <div className={`profile-avatar profile-avatar--${size}`} aria-label={`${username}'s avatar`}>
      {avatarUrl
        ? <img className="profile-avatar__image" src={avatarUrl} alt={`${username} profile picture`} />
        : <span className="profile-avatar__initial" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
      }
    </div>
  );
}

function StatCounter({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div className="profile-stat">
      <span className="profile-stat__value">{value.toLocaleString()}</span>
      <span className="profile-stat__label">{label}</span>
    </div>
  );
}

function FavoriteCard({ show, slot }: { show: FavoriteShow; slot: number }): React.ReactElement {
  const posterUrl = getPosterUrl(show.posterPath, "w342");
  return (
    <Link to={`/shows/${show.showId}`} className="favorite-card" aria-label={`Favorite ${slot}: ${show.title}`}>
      <div className="favorite-card__poster-wrapper">
        {posterUrl
          ? <img className="favorite-card__poster-image" src={posterUrl} alt={`${show.title} poster`} loading="lazy" draggable={false} />
          : <div className="favorite-card__poster-fallback" aria-hidden="true"><span className="favorite-card__poster-fallback-icon">📺</span></div>
        }
        <span className="favorite-card__slot-badge" aria-hidden="true">{slot}</span>
      </div>
      <div className="favorite-card__meta">
        <p className="favorite-card__title">{show.title}</p>
        <p className="favorite-card__year">{show.releaseYear}</p>
      </div>
    </Link>
  );
}

function EmptyFavoriteSlot({ slot, onClick }: { slot: number; onClick?: () => void }): React.ReactElement {
  return (
    <button className="favorite-card favorite-card--empty" type="button"
      aria-label={`Add favorite show to slot ${slot}`} onClick={onClick}>
      <div className="favorite-card__poster-wrapper">
        <div className="favorite-card__empty-poster" aria-hidden="true">
          <span className="favorite-card__empty-icon">＋</span>
        </div>
        <span className="favorite-card__slot-badge" aria-hidden="true">{slot}</span>
      </div>
      <div className="favorite-card__meta">
        <p className="favorite-card__title favorite-card__title--empty">Add a show</p>
      </div>
    </button>
  );
}

// ── Edit Favorites Modal ──────────────────────────────────────────────────────

function EditFavoritesModal({ favorites, onSave, onClose, userId }: {
  favorites: (FavoriteShow | null)[];
  onSave:    (updated: (FavoriteShow | null)[]) => void;
  onClose:   () => void;
  userId:    string;
}): React.ReactElement {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [slots,   setSlots]   = useState<(FavoriteShow | null)[]>(favorites);
  const [editing, setEditing] = useState<number | null>(null); // 0-based slot index

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await searchShows({ query, page: 1 });
    setResults(res.results.slice(0, 6));
  }

  function handlePick(show: any) {
    if (editing === null) return;
    const updated = [...slots];
    updated[editing] = {
      showId:      show.id,
      title:       show.name,
      posterPath:  show.poster_path,
      releaseYear: show.first_air_date?.slice(0, 4) ?? "",
      position:    editing + 1,
    };
    setSlots(updated);
    setEditing(null);
    setResults([]);
    setQuery("");
  }

  function handleRemove(index: number) {
    const updated = [...slots];
    updated[index] = null;
    setSlots(updated);
  }

  async function handleSave() {
    // Persist each non-null slot to Supabase
    for (const show of slots) {
      if (show) {
        await upsertFavorite(userId, {
          tmdbShowId:  show.showId,
          title:       show.title,
          posterPath:  show.posterPath,
          releaseYear: show.releaseYear,
          position:    show.position,
        });
      }
    }
    onSave(slots);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-fav-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-fav-modal__header">
          <h2 className="edit-fav-modal__title">Edit Favorite Shows</h2>
          <button className="edit-fav-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Slots */}
        <div className="edit-fav-modal__slots">
          {slots.map((show, i) => (
            <div key={i} className={`edit-fav-slot ${editing === i ? "edit-fav-slot--active" : ""}`}>
              <span className="edit-fav-slot__num">{i + 1}</span>
              {show ? (
                <div className="edit-fav-slot__show">
                  {show.posterPath && (
                    <img src={getPosterUrl(show.posterPath, "w92")} alt={show.title} className="edit-fav-slot__poster" />
                  )}
                  <span className="edit-fav-slot__title">{show.title}</span>
                  <button className="edit-fav-slot__remove" onClick={() => handleRemove(i)}>✕</button>
                  <button className="edit-fav-slot__change" onClick={() => setEditing(i)}>Change</button>
                </div>
              ) : (
                <button className="edit-fav-slot__add" onClick={() => setEditing(i)}>
                  {editing === i ? "Searching…" : "+ Pick a show"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Search */}
        {editing !== null && (
          <form className="edit-fav-modal__search" onSubmit={handleSearch}>
            <input
              className="edit-fav-modal__search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search for slot ${editing + 1}…`}
              autoFocus
            />
            <button className="edit-fav-modal__search-btn" type="submit">Search</button>
          </form>
        )}

        {results.length > 0 && (
          <div className="edit-fav-modal__results">
            {results.map((r) => (
              <button key={r.id} className="edit-fav-modal__result" onClick={() => handlePick(r)}>
                {r.poster_path && (
                  <img src={getPosterUrl(r.poster_path, "w92")} alt={r.name} className="edit-fav-modal__result-poster" />
                )}
                <span className="edit-fav-modal__result-title">{r.name}</span>
                <span className="edit-fav-modal__result-year">{r.first_air_date?.slice(0, 4)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="edit-fav-modal__actions">
          <button className="edit-fav-modal__cancel" onClick={onClose}>Cancel</button>
          <button className="edit-fav-modal__save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

export default function UserProfile(): React.ReactElement {
  const { username }       = useParams<{ username: string }>();
  const { user: currentUser } = useUser();
  const { diaryLogs }      = useDiary();
  const { currentlyWatching } = useWatchlist();

  const [favorites,       setFavorites]      = useState<(FavoriteShow | null)[]>([null, null, null, null]);
  const [editingFavs,     setEditingFavs]    = useState(false);
  const [favLoading,      setFavLoading]     = useState(true);

  if (!username) return <Navigate to="/home" replace />;

  const isOwnProfile = currentUser?.username === username;

  // Load favorites from Supabase
  useEffect(() => {
    setFavLoading(true);
    fetchFavorites(username).then((rows) => {
      const slots: (FavoriteShow | null)[] = [null, null, null, null];
      for (const row of rows) {
        const idx = row.position - 1;
        if (idx >= 0 && idx < 4) {
          slots[idx] = {
            showId:      row.tmdb_show_id,
            title:       row.title,
            posterPath:  row.poster_path,
            releaseYear: row.release_year ?? "",
            position:    row.position,
          };
        }
      }
      setFavorites(slots);
    }).finally(() => setFavLoading(false));
  }, [username]);

  const droppedCount = useDroppedCount();

  // Stats
  const stats: ProfileStats = {
    showsCompleted:    new Set(diaryLogs.map((l) => l.showId)).size,
    currentlyWatching: currentlyWatching.length,
    dropped:           droppedCount,
  };

  // Recent activity — last 4 diary entries
  const recentActivity = diaryLogs.slice(0, 4);

  const PROFILE_TABS: ProfileTab[] = [
    { label: "Profile",   to: `/${username}` },
    { label: "Shows",     to: `/${username}/shows` },
    { label: "Diary",     to: `/${username}/diary` },
    { label: "Reviews",   to: `/${username}/reviews` },
    { label: "Watchlist", to: `/${username}/watchlist` },
    { label: "Likes",     to: `/${username}/likes` },
  ];

  return (
    <div className="user-profile-page">

      {/* ── Header ── */}
      <header className="profile-header">
        <div className="profile-header__banner" aria-hidden="true" />
        <div className="profile-header__content">
          <div className="profile-header__identity">
            <ProfileAvatar username={username} avatarUrl={currentUser?.avatarUrl ?? null} size="xl" />
            <div className="profile-header__name-group">
              <h1 className="profile-header__username">{username}</h1>
              {currentUser?.displayName && isOwnProfile && (
                <p className="profile-header__display-name">{currentUser.displayName}</p>
              )}
            </div>
          </div>
          <div className="profile-header__stats" role="list" aria-label="Profile statistics">
            <div role="listitem"><StatCounter label="SHOWS COMPLETED"    value={stats.showsCompleted} /></div>
            <div className="profile-header__stats-divider" aria-hidden="true" />
            <div role="listitem"><StatCounter label="CURRENTLY WATCHING" value={stats.currentlyWatching} /></div>
            <div className="profile-header__stats-divider" aria-hidden="true" />
            <div role="listitem"><StatCounter label="DROPPED"            value={stats.dropped} /></div>
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="profile-tabs" aria-label="Profile sections">
        <ul className="profile-tabs__list" role="list">
          {PROFILE_TABS.map((tab) => (
            <li key={tab.to} className="profile-tabs__item" role="listitem">
              <NavLink to={tab.to} end
                className={({ isActive }) =>
                  ["profile-tabs__link", isActive ? "profile-tabs__link--active" : ""].filter(Boolean).join(" ")
                }
              >{tab.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Body ── */}
      <div className="profile-body">

        {/* Favorite Shows */}
        <section className="profile-favorites" aria-labelledby="profile-favorites-heading">
          <div className="profile-favorites__header">
            <h2 className="profile-favorites__title" id="profile-favorites-heading">FAVORITE SHOWS</h2>
            {isOwnProfile && (
              <button className="profile-favorites__edit-button" type="button"
                onClick={() => setEditingFavs(true)}>Edit</button>
            )}
          </div>
          <div className="profile-favorites__grid" role="list" aria-label="Favorite shows (4 slots)">
            {favorites.map((show, index) => {
              const slot = index + 1;
              return (
                <div key={show ? `fav-${show.showId}` : `fav-empty-${slot}`}
                  className="profile-favorites__slot" role="listitem">
                  {favLoading
                    ? <div className="favorite-card favorite-card--skeleton" />
                    : show
                      ? <FavoriteCard show={show} slot={slot} />
                      : <EmptyFavoriteSlot slot={slot} onClick={isOwnProfile ? () => setEditingFavs(true) : undefined} />
                  }
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="profile-recent-activity" aria-labelledby="profile-activity-heading">
          <h2 className="profile-section__title" id="profile-activity-heading">RECENT ACTIVITY</h2>
          {recentActivity.length === 0 ? (
            <p className="profile-section__empty">No activity yet. Start watching a show!</p>
          ) : (
            <div className="recent-activity__list">
              {recentActivity.map((log) => (
                <div key={log.logId} className="activity-item">
                  {log.posterUrl && (
                    <img src={log.posterUrl} alt={log.title} className="activity-item__poster" />
                  )}
                  <div className="activity-item__info">
                    <p className="activity-item__title">{log.title}</p>
                    <p className="activity-item__meta">
                      Season {log.seasonNumber}
                      {log.rating > 0 && <span className="activity-item__rating"> · {"★".repeat(log.rating)}</span>}
                    </p>
                    <p className="activity-item__date">{log.dateLogged}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Edit Favorites Modal */}
      {editingFavs && currentUser && (
        <EditFavoritesModal
          favorites={favorites}
          onSave={setFavorites}
          onClose={() => setEditingFavs(false)}
          userId={currentUser.id}
        />
      )}

    </div>
  );
}
