import { ensureUserProfile, supabase } from './supabase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

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
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (Platform.OS === 'web') {
    const webRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: webRedirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('Google sign-in URL was not returned.');
    }

    // Full-page redirect avoids popup/window.close COOP issues on web.
    window.location.assign(data.url);
    return new Promise<AuthUser>(() => {
      // OAuth continues after redirect and auth state restoration.
    });
  }

  const redirectTo = AuthSession.makeRedirectUri({
    scheme: 'studybuddy',
    path: 'auth/callback',
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('Google sign-in URL was not returned.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }

  const codeMatch = result.url.match(/[?&]code=([^&]+)/);
  const code = codeMatch ? decodeURIComponent(codeMatch[1]) : '';

  if (!code) {
    const errorMatch = result.url.match(/[?&]error_description=([^&]+)/);
    const errorDescription = errorMatch ? decodeURIComponent(errorMatch[1]) : '';
    throw new Error(errorDescription || 'Google sign-in did not return an auth code.');
  }

  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    throw exchangeError;
  }

  const user = exchangeData.user ?? exchangeData.session?.user;
  if (!user) {
    throw new Error('Google sign-in succeeded but no user was returned.');
  }

  const fullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
  await ensureUserProfile(user.id, user.email ?? '', fullName);

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: fullName || 'User',
  };
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
