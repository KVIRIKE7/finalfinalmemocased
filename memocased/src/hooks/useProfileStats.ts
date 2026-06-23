// ─────────────────────────────────────────────────────────────────────────────
// useProfileStats.ts
// Fetches the 3 stat numbers shown in the profile header banner.
// Replaces the hardcoded MOCK_STATS in ProfileShell.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export interface ProfileStats {
  showsCompleted:    number;
  currentlyWatching: number;
  dropped:           number;
}

const DEFAULT: ProfileStats = {
  showsCompleted:    0,
  currentlyWatching: 0,
  dropped:           0,
};

export function useProfileStats(username: string): { stats: ProfileStats; loading: boolean } {
  const [stats,   setStats]   = useState<ProfileStats>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) { setLoading(false); return; }

    let cancelled = false;

    (async () => {
      setLoading(true);

      // 1. Resolve username → user_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (!profile || cancelled) { setLoading(false); return; }

      // 2. Fetch from the profile_stats view
      const { data } = await supabase
        .from("profile_stats")
        .select("shows_completed, currently_watching, dropped")
        .eq("user_id", profile.id)
        .single();

      if (!cancelled) {
        setStats(
          data
            ? {
                showsCompleted:    Number(data.shows_completed),
                currentlyWatching: Number(data.currently_watching),
                dropped:           Number(data.dropped),
              }
            : DEFAULT
        );
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [username]);

  return { stats, loading };
}
