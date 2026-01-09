/**
 * AUTHENTICATION UTILITIES
 *
 * Wraps Supabase Auth for cleaner, predictable auth flow throughout the app.
 * All auth operations funnel through these functions.
 *
 * KY - KEY CONCEPTS:
 * - Google OAuth is the only sign-in method
 * - Supabase Auth handles user creation and sessions
 * - ensureUserRecord() syncs auth.users -> public.users table (for app data)
 * - onAuthStateChange() subscribes to auth events (sign-in, sign-out, token refresh)
 *
 * KY - USER FLOW:
 * 1. User clicks "Sign in with Google"
 * 2. signInWithGoogle() redirects to Google OAuth
 * 3. Google redirects back to /callback
 * 4. Callback page calls Supabase to exchange code for session
 * 5. onAuthStateChange fires SIGNED_IN event
 * 6. ensureUserRecord creates/updates row in public.users table
 * 7. User redirects to /dashboard
 */

import type { AuthChangeEvent, Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabaseClient";
import type { Database, Tables } from "./database.types";

type GenericClient = SupabaseClient<Database>;

function resolveClient(client?: GenericClient): GenericClient {
  return client ?? getSupabaseBrowserClient();
}

/**
 * Initiates the Google OAuth flow. Redirect handling is left to Supabase.
 */
export async function signInWithGoogle(redirectPath = "/callback?redirect=/dashboard") {
  if (typeof window === "undefined") {
    throw new Error("signInWithGoogle must be executed in the browser.");
  }

  const client = resolveClient();
  const redirectUrl = `${window.location.origin}${redirectPath}`;

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // If data.url exists, the redirect happens automatically
  // Otherwise, return the data for handling
  return data;
}

/**
 * Logs out the current session and clears persisted credentials.
 */
export async function signOut() {
  const client = resolveClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Returns the active session in the browser (if any).
 */
export async function getCurrentSession(): Promise<Session | null> {
  const client = resolveClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data.session ?? null;
}

/**
 * Returns the currently authenticated user (browser), or null when signed out.
 */
export async function getCurrentUser(): Promise<User | null> {
  const client = resolveClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.message === "Auth session missing!" || error.name === "AuthSessionMissingError") {
      return null;
    }
    throw new Error(error.message);
  }
  return data.user ?? null;
}

/**
 * Ensures a corresponding record exists in the `users` table for the Supabase user.
 * We upsert based on the auth UUID so repeated calls are safe.
 */
export async function ensureUserRecord(user: User, client?: GenericClient) {
  const activeClient = resolveClient(client);

  // Email is required in the schema
  if (!user.email) {
    console.warn("User missing email, cannot create record in public.users");
    return;
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.given_name;

  const avatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.avatar ||
    user.user_metadata?.picture;

  const payload = {
    id: user.id,
    email: user.email,
    full_name: fullName || null,
    avatar_url: avatar || null,
  };

  // Type assertion needed due to Supabase type inference limitations
  const { error } = await (activeClient.from("users") as any).upsert(payload, { onConflict: "id" });

  if (error && error.code !== 'PGRST116') {
    console.warn("Unable to persist user profile:", error.message);
    // Don't throw - allow auth to continue even if user table doesn't exist yet
  }
}

type AuthCallback = (payload: { event: AuthChangeEvent; session: Session | null }) => void;

/**
 * Subscribes to Supabase auth state changes. Automatically keeps the profile table in sync.
 */
export function onAuthStateChange(callback: AuthCallback) {
  const client = resolveClient();
  const { data } = client.auth.onAuthStateChange(async (event, session) => {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
      try {
        await ensureUserRecord(session.user, client);
      } catch (err) {
        console.warn("ensureUserRecord failed after auth change:", err);
      }
    }

    callback({ event, session: session ?? null });
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
