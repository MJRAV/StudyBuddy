import { supabase } from '@/app/lib/firebase';
import { getCoursesFromCatalog, type Major, type Year, type Semester } from '@/app/lib/courseCatalog';

export async function getCoursesForTerm(
  major: Major | null,
  year: Year | null,
  semester: Semester | null,
): Promise<string[]> {
  if (!major || !year || !semester) {
    return [];
  }

  if (!supabase) {
    return getCoursesFromCatalog(major, year, semester);
  }

  const { data, error } = await supabase
    .from('courses')
    .select('name')
    .eq('major', major)
    .eq('year_level', year)
    .eq('semester', String(semester))
    .order('name', { ascending: true });

  if (error) {
    return getCoursesFromCatalog(major, year, semester);
  }

  const names = (data ?? []).map((item) => String(item.name ?? '')).filter(Boolean);
  if (!names.length) {
    return getCoursesFromCatalog(major, year, semester);
  }

  return names;
}
