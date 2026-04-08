import { isSupabaseConfigured, supabase } from "@/app/lib/firebase";
import { ensureUserProfile } from "@/app/lib/userService";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

function assertSupabaseAuth(): void {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
}

function normalizeUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null,
  };
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  assertSupabaseAuth();

  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name.trim() || null,
      },
    },
  });

  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    throw new Error("Sign up succeeded but no user was returned.");
  }

  const sessionUser = data.session?.user;
  if (!sessionUser) {
    throw new Error("Account created. Check your email to confirm, then sign in.");
  }

  localStorage.setItem("userId", sessionUser.id);

  await ensureUserProfile(sessionUser.id, sessionUser.email ?? email, name.trim());
  return normalizeUser(sessionUser);
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  assertSupabaseAuth();

  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    throw new Error("Login succeeded but no user was returned.");
  }

  localStorage.setItem("userId", user.id);
  await ensureUserProfile(
    user.id,
    user.email ?? email,
    typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "",
  );
  return normalizeUser(user);
}

export async function loginWithGoogle(): Promise<AuthUser> {
  assertSupabaseAuth();

  const { error } = await supabase!.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });

  if (error) {
    throw error;
  }

  throw new Error("Redirecting to Google sign-in. Complete auth and return to the app.");
}

export async function logoutUser(): Promise<void> {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
  localStorage.removeItem("userId");
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem("userId");
}
