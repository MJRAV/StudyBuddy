import { supabase } from "@/app/lib/firebase";

export type CourseRoles = Record<string, "mentor" | "mentee">;

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  yearLevel: string;
  major: string;
  semester: string;
  userRole: "mentor" | "mentee" | "";
  selectedCourses: string[];
  courseRoles: CourseRoles;
  hasSeenOnboarding: boolean;
};

function toInsertRow(uid: string, email: string, name: string): Record<string, unknown> {
  return {
    uid,
    email,
    name: name || "",
    avatar_url: "",
    bio: "",
    year_level: "1",
    major: "",
    semester: "",
    user_role: "",
    selected_courses: [],
    course_roles: {},
    has_seen_onboarding: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  name = "",
): Promise<void> {
  if (!supabase) {
    return;
  }

  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("uid")
    .eq("uid", uid)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (!existing) {
    const { error } = await supabase.from("users").insert(toInsertRow(uid, email, name.trim()));

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from("users")
    .update({
      email,
      ...(name ? { name } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("uid", uid);

  if (error) {
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    avatarUrl: String(data.avatar_url ?? ""),
    bio: String(data.bio ?? ""),
    yearLevel: String(data.year_level ?? data.yearLevel ?? "1"),
    major: String(data.major ?? ""),
    semester: String(data.semester ?? ""),
    userRole: (data.user_role as UserProfile["userRole"]) ?? "",
    selectedCourses: Array.isArray(data.selected_courses) ? data.selected_courses : [],
    courseRoles: (data.course_roles as CourseRoles) ?? {},
    hasSeenOnboarding: Boolean(data.has_seen_onboarding),
  };
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid" | "email">> & { email?: string },
): Promise<void> {
  if (!supabase) {
    return;
  }

  const payload = removeUndefinedValues({
    name: updates.name,
    email: updates.email,
    avatar_url: (updates as Partial<UserProfile>).avatarUrl,
    bio: updates.bio,
    year_level: updates.yearLevel,
    major: updates.major,
    semester: updates.semester,
    user_role: updates.userRole,
    selected_courses: updates.selectedCourses,
    course_roles: updates.courseRoles,
    has_seen_onboarding: updates.hasSeenOnboarding,
    updated_at: new Date().toISOString(),
  });

  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw error;
  }
}

export async function uploadProfilePicture(uid: string, file: File): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const client = supabase;
  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `${uid}/avatar-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await client.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'image/png',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from('avatars').getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await client
    .from('users')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('uid', uid);

  if (updateError) {
    throw updateError;
  }

  return publicUrl;
}
