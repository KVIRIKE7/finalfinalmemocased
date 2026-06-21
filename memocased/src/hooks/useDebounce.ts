// ─────────────────────────────────────────────────────────────────────────────
// useDebounce
// Returns a debounced copy of `value` that only updates after `delayMs`
// milliseconds of silence. Used by the LogModal live-search to avoid
// hammering the TMDB API on every keystroke.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}