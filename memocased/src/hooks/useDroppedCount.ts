// ─────────────────────────────────────────────────────────────────────────────
// useDroppedCount.ts
// Returns the number of shows the current user has marked as dropped.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useUser } from "../store/UserContext";

export function useDroppedCount(): number {
  const { user } = useUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }

    supabase
      .from("show_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "dropped")
      .then(({ count: c }) => setCount(c ?? 0));
  }, [user]);

  return count;
}
