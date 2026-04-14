import type { Major, Year, Semester } from './courseCatalog';
import { getCoursesFromCatalog } from './courseCatalog';
import { supabase } from './supabase';

export async function getCoursesForTerm(
  major: Major,
  year: Year,
  semester: Semester,
): Promise<string[]> {
  if (!supabase) {
    console.log('[courses] Supabase client not configured, using static catalog', {
      major,
      year,
      semester,
    });
    return getCoursesFromCatalog(major, year, semester);
  }

  console.log('[courses] Fetching from Supabase', { major, year, semester });

  const { data, error } = await supabase
    .from('courses')
    .select('name')
    .eq('major', major)
    .eq('year_level', year)
    .eq('semester', semester)
    .order('name', { ascending: true });

  if (error) {
    console.log('[courses] Error from Supabase, falling back to catalog', error);
    return getCoursesFromCatalog(major, year, semester);
  }

  const rows = (data ?? []).map((item) => String(item.name ?? '')).filter(Boolean);
  console.log('[courses] Rows from Supabase', { count: rows.length });

  return rows.length > 0 ? rows : getCoursesFromCatalog(major, year, semester);
}
