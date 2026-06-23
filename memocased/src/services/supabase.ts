// ─────────────────────────────────────────────────────────────────────────────
// Supabase client — single instance shared across the whole app.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "[Memocased] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n" +
    "Add them to your .env file."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:    true,   // keeps the user logged in across reloads
    autoRefreshToken:  true,
    detectSessionInUrl: true,  // handles OAuth/magic-link redirects
  },
});
