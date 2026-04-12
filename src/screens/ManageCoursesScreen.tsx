import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Major, Semester, Year } from '../lib/courseCatalog';
import { getCoursesForTerm } from '../lib/coursesService';
import { supabase } from '../lib/supabase';
import { AppButton, AppInput, Badge, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type CourseRoles = Record<string, 'mentor' | 'mentee'>;

type Props = {
  uid: string;
  onComplete: () => Promise<void> | void;
};

export function ManageCoursesScreen({ uid, onComplete }: Props) {
  const [major, setMajor] = useState<Major | null>(null);
  const [year, setYear] = useState<Year | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [courseRoles, setCourseRoles] = useState<CourseRoles>({});
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Load current profile settings and course roles
  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('users')
        .select('major,year_level,semester,course_roles')
        .eq('uid', uid)
        .maybeSingle();

      if (!active) return;

      if (error) {
        Alert.alert('Load failed', error.message);
        return;
      }

      const majorValue = (data?.major as Major | null) ?? 'BSIT';
      const yearValue = (data?.year_level as Year | null) ?? '1';
      const semesterValue = (data?.semester as Semester | null) ?? '1';

      setMajor(majorValue);
      setYear(yearValue);
      setSemester(semesterValue);
      setCourseRoles(((data?.course_roles as Record<string, string> | null) ?? {}) as CourseRoles);
    };

    void load();

    return () => {
      active = false;
    };
  }, [uid]);

  // Fetch available courses whenever filters change
  useEffect(() => {
    if (!major || !year || !semester) {
      return;
    }

    let active = true;

    void getCoursesForTerm(major, year, semester).then((items) => {
      if (active) {
        setAvailableCourses(items);
      }
    });

    return () => {
      active = false;
    };
  }, [major, year, semester]);

  const toggleCourseRole = (course: string, role: 'mentor' | 'mentee') => {
    setCourseRoles((prev) => {
      if (prev[course] === role) {
        const copy = { ...prev };
        delete copy[course];
        return copy;
      }
      return { ...prev, [course]: role };
    });
  };

  const visibleCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return availableCourses;
    }
    return availableCourses.filter((c) => c.toLowerCase().includes(term));
  }, [availableCourses, search]);

  const handleSave = async () => {
    if (!supabase || !major || !year || !semester) {
      return;
    }

    try {
      setSaving(true);
      const selectedCourses = Object.keys(courseRoles);

      const { error: profileError } = await supabase
        .from('users')
        .update({
          major,
          year_level: year,
          semester,
          selected_courses: selectedCourses,
          course_roles: courseRoles,
          updated_at: new Date().toISOString(),
        })
        .eq('uid', uid);

      if (profileError) {
        throw profileError;
      }

      const { data: courseRows, error: courseError } = await supabase
        .from('courses')
        .select('id,name')
        .in('name', selectedCourses)
        .eq('major', major)
        .eq('year_level', year)
        .eq('semester', semester);

      if (courseError) {
        throw courseError;
      }

      const rowsToUpsert = (courseRows ?? [])
        .map((row) => ({
          user_uid: uid,
          course_id: String(row.id ?? ''),
          role: courseRoles[String(row.name ?? '')],
          updated_at: new Date().toISOString(),
        }))
        .filter((row) => row.course_id && row.role);

      if (rowsToUpsert.length) {
        const { error: upsertError } = await supabase
          .from('user_courses')
          .upsert(rowsToUpsert, { onConflict: 'user_uid,course_id' });

        if (upsertError) {
          throw upsertError;
        }
      }

      await onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save selected courses.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(major && year && semester && Object.keys(courseRoles).length > 0);

  return (
    <Screen>
      <View style={styles.container}>
        <Heading>Manage Your Courses</Heading>
        <Subheading>Add or remove courses and update your mentor/mentee roles</Subheading>

        <Card style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Course filters</Text>

          <Text style={styles.filterLabel}>Major</Text>
          <View style={styles.filterRow}>
            {(['BSIT', 'BSCS', 'BSIS'] as Major[]).map((item) => (
              <Pressable key={item} onPress={() => setMajor(item)} style={styles.badgeWrap}>
                <Badge text={item} active={major === item} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Year</Text>
          <View style={styles.filterRow}>
            {(['1', '2', '3', '4'] as Year[]).map((item) => (
              <Pressable key={item} style={styles.gridOption} onPress={() => setYear(item)}>
                <Badge text={`Year ${item}`} active={year === item} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Semester</Text>
          <View style={styles.filterRow}>
            {(['1', '2'] as Semester[]).map((item) => (
              <Pressable key={item} style={styles.gridOption} onPress={() => setSemester(item)}>
                <Badge text={`Semester ${item}`} active={semester === item} />
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.coursesCard}>
          <Text style={styles.stepTitle}>Available Courses</Text>
          <AppInput
            placeholder="Search courses"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          <Text style={styles.coursesMeta}>
            Showing {visibleCourses.length} of {availableCourses.length} courses
          </Text>

          <ScrollView style={styles.courseList}>
            {visibleCourses.map((course) => (
              <View key={course} style={styles.courseCard}>
                <Text style={styles.courseName}>{course}</Text>
                <View style={styles.roleRow}>
                  <Pressable
                    style={styles.roleButton}
                    onPress={() => toggleCourseRole(course, 'mentee')}
                  >
                    <Badge text="Mentee" active={courseRoles[course] === 'mentee'} />
                  </Pressable>
                  <Pressable
                    style={styles.roleButton}
                    onPress={() => toggleCourseRole(course, 'mentor')}
                  >
                    <Badge text="Mentor" active={courseRoles[course] === 'mentor'} />
                  </Pressable>
                </View>
              </View>
            ))}

            {visibleCourses.length === 0 ? (
              <Text style={styles.empty}>No courses match your search.</Text>
            ) : null}
          </ScrollView>
        </Card>

        <View style={styles.footer}>
          <View style={styles.navWrap}>
            <AppButton
              text={saving ? 'Saving…' : 'Save Changes'}
              disabled={!canSave || saving}
              onPress={() => canSave && !saving && void handleSave()}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    marginTop: 10,
    marginBottom: 10,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 8,
  },
  filterLabel: {
    marginTop: 6,
    marginBottom: 4,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  gridOption: {
    minWidth: '46%',
    marginBottom: 6,
  },
  coursesCard: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 8,
  },
  searchInput: {
    marginBottom: 6,
  },
  coursesMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  courseList: {
    flex: 1,
  },
  courseCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  courseName: {
    fontWeight: '600',
    color: colors.textStrong,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {},
  footer: {
    marginTop: 10,
  },
  navWrap: {
    minWidth: 160,
    alignSelf: 'flex-end',
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 10,
  },
});
