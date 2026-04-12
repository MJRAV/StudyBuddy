import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  avatarUrl: string;
  userRole: string;
  selectedCourses: string[];
};

export async function ensureUserProfile(uid: string, email: string, name = ''): Promise<void> {
  if (!supabase) {
    return;
  }

  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('uid')
    .eq('uid', uid)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (!existing) {
    const { error } = await supabase.from('users').insert({
      uid,
      email,
      name: name || '',
      avatar_url: '',
      bio: '',
      year_level: '1',
      major: '',
      semester: '',
      user_role: '',
      selected_courses: [],
      course_roles: {},
      has_seen_onboarding: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({
      email,
      ...(name ? { name } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('uid', uid);

  if (error) {
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('uid,email,name,avatar_url,user_role,selected_courses')
    .eq('uid', uid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    uid: String(data.uid ?? uid),
    email: String(data.email ?? ''),
    name: String(data.name ?? 'User'),
    avatarUrl: String(data.avatar_url ?? ''),
    userRole: String(data.user_role ?? ''),
    selectedCourses: Array.isArray(data.selected_courses)
      ? data.selected_courses.map((item: unknown) => String(item))
      : [],
  };
}
