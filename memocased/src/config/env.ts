// ─────────────────────────────────────────────────────────────────────────────
// Environment configuration — validated at module load time.
// Import this in main.tsx before anything else to surface missing vars early.
// ─────────────────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `[Memocased] Missing required environment variable: ${key}\n` +
        `Copy .env.example → .env and fill in your values.`
    );
  }
  return value;
}

export const env = {
  tmdb: {
    apiKey: requireEnv("VITE_TMDB_API_KEY"),
    baseUrl: requireEnv("VITE_TMDB_BASE_URL"),
  },
} as const;