import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Compatibility export to avoid touching every component in one pass.
export const isFirebaseConfigured = isSupabaseConfigured;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const db = supabase;
export const auth = supabase?.auth ?? null;
export const googleProvider = null;
