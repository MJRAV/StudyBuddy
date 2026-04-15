import { supabase, type UserProfile, getUserProfile as getSlimUserProfile } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export type UserProfileRecord = UserProfile & {
  bio: string;
  major: string;
  yearLevel: string;
  semester: string;
  hasSeenOnboarding: boolean;
  courseRoles: Record<string, 'mentor' | 'mentee'>;
};

export async function getUserProfile(uid: string): Promise<UserProfileRecord | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('uid,email,name,avatar_url,user_role,selected_courses,bio,major,year_level,semester,has_seen_onboarding,course_roles,suspension_level,suspension_reason,suspended_until')
    .eq('uid', uid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const selectedCourses = Array.isArray(data.selected_courses)
    ? data.selected_courses.map((item: unknown) => String(item))
    : [];

  const courseRoles: Record<string, 'mentor' | 'mentee'> = {};
  const rawRoles = data.course_roles as Record<string, unknown> | null;
  if (rawRoles) {
    Object.entries(rawRoles).forEach(([course, role]) => {
      if (role === 'mentor' || role === 'mentee') {
        courseRoles[course] = role;
      }
    });
  }

  return {
    uid: String(data.uid ?? uid),
    email: String(data.email ?? ''),
    name: String(data.name ?? 'User'),
    avatarUrl: String(data.avatar_url ?? ''),
    userRole: String(data.user_role ?? ''),
    selectedCourses,
    bio: String(data.bio ?? ''),
    major: String(data.major ?? ''),
    yearLevel: String(data.year_level ?? ''),
    semester: String(data.semester ?? ''),
    hasSeenOnboarding: Boolean(data.has_seen_onboarding),
    courseRoles,
    suspensionLevel: String(data.suspension_level ?? ''),
    suspensionReason: String(data.suspension_reason ?? ''),
    suspendedUntil: String(data.suspended_until ?? ''),
  };
}

export async function getUserProfileSlim(uid: string): Promise<UserProfile | null> {
  return getSlimUserProfile(uid);
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<{
    name: string;
    email: string;
    avatarUrl: string;
    bio: string;
    major: string;
    yearLevel: string;
    semester: string;
    hasSeenOnboarding: boolean;
    userRole: string;
  }>,
): Promise<void> {
  if (!supabase) {
    return;
  }

  const payload = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    ...(patch.major !== undefined ? { major: patch.major } : {}),
    ...(patch.yearLevel !== undefined ? { year_level: patch.yearLevel } : {}),
    ...(patch.semester !== undefined ? { semester: patch.semester } : {}),
    ...(patch.hasSeenOnboarding !== undefined ? { has_seen_onboarding: patch.hasSeenOnboarding } : {}),
    ...(patch.userRole !== undefined ? { user_role: patch.userRole } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('users').update(payload).eq('uid', uid);
  if (error) {
    throw error;
  }
}

export async function manageUserCourses(
  uid: string,
  data: {
    major?: string;
    yearLevel?: string;
    semester?: string;
    courseRoles: Record<string, 'mentor' | 'mentee'>;
  },
): Promise<void> {
  if (!supabase) {
    return;
  }

  const selectedCourses = Object.keys(data.courseRoles);

  const { error: profileError } = await supabase
    .from('users')
    .update({
      ...(data.major !== undefined ? { major: data.major } : {}),
      ...(data.yearLevel !== undefined ? { year_level: data.yearLevel } : {}),
      ...(data.semester !== undefined ? { semester: data.semester } : {}),
      selected_courses: selectedCourses,
      course_roles: data.courseRoles,
      updated_at: new Date().toISOString(),
    })
    .eq('uid', uid);

  if (profileError) {
    throw profileError;
  }
}

export async function uploadProfilePicture(uid: string, fileUri: string): Promise<string> {
  if (!supabase) {
    return '';
  }

  const normalizedUri = fileUri.startsWith('file://') || fileUri.startsWith('content://')
    ? fileUri
    : `file://${fileUri}`;
  const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileBuffer = decode(base64);
  const path = `${uid}/avatar-${Date.now()}.jpg`;

  const { error } = await supabase.storage.from('avatars').upload(path, fileBuffer, {
    upsert: true,
    contentType: 'image/jpeg',
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = data.publicUrl;

  await updateUserProfile(uid, { avatarUrl: publicUrl });
  return publicUrl;
}
