import type { Major, Year, Semester } from './courseCatalog';
import { getCoursesFromCatalog } from './courseCatalog';
import { supabase } from './supabase';

export async function getCoursesForTerm(major: Major, year: Year, semester: Semester): Promise<string[]> {
  if (!supabase) {
    return getCoursesFromCatalog(major, year, semester);
  }

  const { data, error } = await supabase
    .from('courses')
    .select('name')
    .eq('major', major)
    .eq('year_level', year)
    .eq('semester', semester)
    .order('name', { ascending: true });

  if (error) {
    return getCoursesFromCatalog(major, year, semester);
  }

  const rows = (data ?? []).map((item) => String(item.name ?? '')).filter(Boolean);
  return rows.length > 0 ? rows : getCoursesFromCatalog(major, year, semester);
}
