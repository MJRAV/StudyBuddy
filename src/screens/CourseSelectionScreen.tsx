import { useEffect, useMemo, useRef, useState } from 'react';
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

export function CourseSelectionScreen({ uid, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [major, setMajor] = useState<Major | null>(null);
  const [year, setYear] = useState<Year | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [courseRoles, setCourseRoles] = useState<CourseRoles>({});
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    if (step !== 4 || !major || !year || !semester) {
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
  }, [step, major, year, semester]);

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

  const canProceed =
    (step === 1 && major) ||
    (step === 2 && year) ||
    (step === 3 && semester) ||
    (step === 4 && Object.keys(courseRoles).length > 0);

  const visibleCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return availableCourses;
    }
    return availableCourses.filter((c) => c.toLowerCase().includes(term));
  }, [availableCourses, search]);

  const selectionSummary = useMemo(() => {
    if (!major || !year || !semester) {
      return '';
    }
    return `${major} – Year ${year}, Semester ${semester}`;
  }, [major, year, semester]);

  const stepsMeta = [
    { id: 1, label: 'Major' },
    { id: 2, label: 'Year' },
    { id: 3, label: 'Semester' },
    { id: 4, label: 'Courses' },
  ] as const;

  const stepTitle =
    step === 1
      ? "What's your major?"
      : step === 2
      ? 'What year are you in?'
      : step === 3
      ? 'What semester?'
      : 'Select your courses';

  const stepSubtitle =
    step === 1
      ? 'Select your degree program'
      : step === 2
      ? 'Select your current year level'
      : step === 3
      ? 'Are you in 1st or 2nd semester?'
      : 'Choose courses and your role for each (mentor or mentee)';

  const handleFinish = async () => {
    if (!supabase || !major || !year || !semester) {
      return;
    }

    if (saveInFlightRef.current) {
      return;
    }

    try {
      saveInFlightRef.current = true;
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

      const dedupedRows = Array.from(
        rowsToUpsert.reduce((map, row) => {
          map.set(row.course_id, row);
          return map;
        }, new Map<string, (typeof rowsToUpsert)[number]>()),
      ).map((entry) => entry[1]);

      // Sync strategy is more resilient than upsert for projects with legacy schema drift.
      const { error: deleteError } = await supabase
        .from('user_courses')
        .delete()
        .eq('user_uid', uid);

      if (deleteError) {
        throw deleteError;
      }

      if (dedupedRows.length) {
        const { error: insertError } = await supabase
          .from('user_courses')
          .insert(dedupedRows);

        if (insertError) {
          throw insertError;
        }
      }

      await onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save selected courses.';
      Alert.alert('Save failed', message);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Card style={styles.wizardCard}>
          <View style={styles.progressRow}>
            {stepsMeta.map((item, index) => {
              const isDone = step > item.id;
              const isActive = step === item.id;
              const pillStyle = [
                styles.progressPill,
                isActive && styles.progressPillActive,
                isDone && styles.progressPillDone,
              ];
              const pillTextStyle = [
                styles.progressPillText,
                (isActive || isDone) && styles.progressPillTextActive,
              ];
              const labelStyle = [
                styles.progressLabel,
                (isActive || isDone) && styles.progressLabelActive,
              ];

              return (
                <View key={item.id} style={styles.progressItem}>
                  <View style={pillStyle}>
                    <Text style={pillTextStyle}>{isDone ? '✓' : item.id}</Text>
                  </View>
                  <Text style={labelStyle}>{item.label}</Text>
                  {index < stepsMeta.length - 1 ? (
                    <Text style={styles.progressArrow}>→</Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Heading style={styles.mainTitle}>{stepTitle}</Heading>
          <Subheading style={styles.mainSubtitle}>{stepSubtitle}</Subheading>

          {step === 1 ? (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>Course information</Text>
              {(['BSIT', 'BSCS', 'BSIS'] as Major[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setMajor(item)}
                  style={[styles.optionCard, major === item && styles.optionCardActive]}
                >
                  <Text style={styles.optionPrimary}>{item}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>Select year level</Text>
              <View style={styles.gridRow}>
                {(['1', '2', '3', '4'] as Year[]).map((item) => (
                  <Pressable
                    key={item}
                    style={[
                      styles.gridOption,
                      styles.optionCard,
                      year === item && styles.optionCardActive,
                    ]}
                    onPress={() => setYear(item)}
                  >
                    <Text style={styles.optionNumber}>{item}</Text>
                    <Text style={styles.optionLabel}>{`Year ${item}`}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>Select semester</Text>
              <View style={styles.gridRow}>
                {(['1', '2'] as Semester[]).map((item) => (
                  <Pressable
                    key={item}
                    style={[
                      styles.gridOption,
                      styles.optionCard,
                      semester === item && styles.optionCardActive,
                    ]}
                    onPress={() => setSemester(item)}
                  >
                    <Text style={styles.optionNumber}>{item}</Text>
                    <Text style={styles.optionLabel}>
                      {item === '1' ? 'First Semester' : 'Second Semester'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View style={styles.stepWrapLarge}>
              <Text style={styles.stepTitle}>Select your courses</Text>
              {selectionSummary ? (
                <View style={styles.selectionBanner}>
                  <Text style={styles.selectionLabel}>Your selection:</Text>
                  <Text style={styles.selectionValue}>{selectionSummary}</Text>
                </View>
              ) : null}
              <AppInput
                placeholder="Search courses"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
              <Text style={styles.resultsMeta}>
                Found {visibleCourses.length} course{visibleCourses.length === 1 ? '' : 's'}
              </Text>
              <View style={styles.courseList}>
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
              </View>
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.navWrap}>
              <AppButton
                text="Back"
                variant="outline"
                disabled={step === 1}
                onPress={() => step > 1 && setStep((s) => s - 1)}
              />
            </View>
            {step < 4 ? (
              <View style={styles.navWrap}>
                <AppButton
                  text="Next"
                  disabled={!canProceed}
                  onPress={() => canProceed && setStep((s) => s + 1)}
                />
              </View>
            ) : (
              <View style={styles.navWrap}>
                <AppButton
                  text={saving ? 'Saving...' : 'Complete'}
                  disabled={!canProceed || saving}
                  onPress={() => canProceed && !saving && void handleFinish()}
                />
              </View>
            )}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fef3c7',
  },
  wizardCard: {
    borderRadius: 22,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  progressPill: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: colors.white,
  },
  progressPillActive: {
    backgroundColor: '#facc15',
    borderColor: '#facc15',
  },
  progressPillDone: {
    backgroundColor: '#facc15',
    borderColor: '#facc15',
  },
  progressPillText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
  },
  progressPillTextActive: {
    color: '#14532d',
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  progressLabelActive: {
    color: colors.textStrong,
    fontWeight: '700',
  },
  progressArrow: {
    marginHorizontal: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  mainTitle: {
    marginTop: 8,
  },
  mainSubtitle: {
    marginBottom: 8,
  },
  stepWrap: {
    marginTop: 10,
  },
  stepWrapLarge: {
    marginTop: 10,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 8,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridOption: {
    minWidth: '46%',
  },
  searchInput: {
    marginBottom: 10,
  },
  courseList: {
    marginTop: 4,
  },
  resultsMeta: {
    marginBottom: 6,
    color: colors.textMuted,
    fontSize: 12,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  navWrap: {
    minWidth: 120,
  },
  selectionBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f97316',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  selectionLabel: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '700',
  },
  selectionValue: {
    fontSize: 13,
    color: colors.textStrong,
    marginTop: 2,
  },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  optionCardActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  optionPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textStrong,
  },
  optionNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textStrong,
  },
  optionLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
});
