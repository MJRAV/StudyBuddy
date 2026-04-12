import { ensureUserProfile, supabase } from './supabase';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function getCurrentUserId(): Promise<string> {
  if (!supabase) {
    return '';
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? '';
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }

  const user = data.user;
  await ensureUserProfile(user.id, user.email ?? email, user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');

  return {
    id: user.id,
    email: user.email ?? email,
    displayName: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'User'),
  };
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, full_name: name } },
  });

  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    throw new Error('Registration succeeded but no user was returned.');
  }

  await ensureUserProfile(user.id, user.email ?? email, name);

  return {
    id: user.id,
    email: user.email ?? email,
    displayName: name || 'User',
  };
}

export async function loginWithGoogle(): Promise<AuthUser> {
  throw new Error('Google sign-in is not configured for this React Native build yet.');
}

export async function logoutUser(): Promise<void> {
  if (!supabase) {
    return;
  }
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
}
