// ─────────────────────────────────────────────────────────────────────────────
// authService.ts
// All Supabase Auth calls in one place. Import these in SignIn / SignUp pages.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabase";
import type { AuthUser } from "../types/navbar";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Maps a Supabase profile row to the AuthUser shape the app uses. */
function toAuthUser(profile: {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}): AuthUser {
  return {
    id:          profile.id,
    username:    profile.username,
    displayName: profile.display_name,
    avatarUrl:   profile.avatar_url,
  };
}

// ── Sign Up ───────────────────────────────────────────────────────────────────

export interface SignUpPayload {
  fullName:        string;
  username:        string;
  email:           string;
  password:        string;
}

export interface AuthResult {
  user:  AuthUser | null;
  error: string | null;
}

/**
 * Creates a Supabase Auth account and a matching profile row.
 * The trigger in schema.sql creates the profile row automatically,
 * but we pass full_name and desired username via user_metadata so the
 * trigger can use them.
 */
export async function signUp(payload: SignUpPayload): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email:    payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        username:  payload.username,
      },
    },
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: "Sign up failed. Please try again." };

  // Update the username in the profile row the trigger just created
  // (trigger uses email prefix as default; override with what the user typed)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ username: payload.username, display_name: payload.fullName })
    .eq("id", data.user.id);

  if (profileError) {
    // Non-fatal: user is created, profile update failed — log and continue
    console.warn("[authService] Profile update failed:", profileError.message);
  }

  // Fetch the finalised profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", data.user.id)
    .single();

  return {
    user: profile ? toAuthUser(profile) : null,
    error: null,
  };
}

// ── Sign In ───────────────────────────────────────────────────────────────────

export interface SignInPayload {
  identifier: string; // email or username
  password:   string;
}

export async function signIn(payload: SignInPayload): Promise<AuthResult> {
  // Determine if the identifier is an email or a username
  const isEmail = payload.identifier.includes("@");

  let email = payload.identifier;

  // If it's a username, look up the email first
  if (!isEmail) {
    const { data: profile, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", payload.identifier)
      .single();

    if (lookupError || !profile) {
      return { user: null, error: "No account found with that username." };
    }

    // Get the email from auth.users via a Supabase Edge Function or
    // store email in profiles. For now, ask for email at sign-in.
    // This is the simplest approach without a server function.
    return { user: null, error: "Please sign in with your email address." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: payload.password,
  });

  if (error) return { user: null, error: "Invalid email or password." };
  if (!data.user) return { user: null, error: "Sign in failed." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", data.user.id)
    .single();

  return {
    user: profile ? toAuthUser(profile) : null,
    error: null,
  };
}

// ── Sign Out ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ── Get Current Session ───────────────────────────────────────────────────────

/**
 * Called once on app load to rehydrate the user from a persisted session.
 * Returns null if no session exists (user is logged out).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", session.user.id)
    .single();

  return profile ? toAuthUser(profile) : null;
}
