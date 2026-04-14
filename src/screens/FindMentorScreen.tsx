import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getUserProfile, supabase } from '../lib/supabase';
import { AppButton, AppInput, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type Mentor = {
  uid: string;
  name: string;
  major: string;
  courses: string[];
  role: string;
  bio: string;
};

type Props = { uid: string };

export function FindMentorScreen({ uid }: Props) {
  const [myCourses, setMyCourses] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [connectedIds, setConnectedIds] = useState<Record<string, boolean>>({});
  const [courseFilter, setCourseFilter] = useState('all');
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const me = await getUserProfile(uid);

      const [mentorsResp, buddiesResp, incomingResp, outgoingResp] = await Promise.all([
        supabase
          .from('users')
          .select('uid,name,bio,major,selected_courses,user_role,course_roles')
          .neq('uid', uid),
        supabase
          .from('buddies')
          .select('buddy_id')
          .eq('owner_id', uid),
        supabase
          .from('friend_requests')
          .select('requester_id,status')
          .eq('target_id', uid),
        supabase
          .from('friend_requests')
          .select('target_id,status')
          .eq('requester_id', uid),
      ]);

      if (!active) {
        return;
      }

      setMyCourses(me?.selectedCourses ?? []);

      if (mentorsResp.error || buddiesResp.error || incomingResp.error || outgoingResp.error) {
        return;
      }

      const mentorRows = (mentorsResp.data ?? [])
        .map((row) => {
          const role = String(row.user_role ?? '');
          const courseRoles = (row.course_roles ?? {}) as Record<string, string>;
          const mentorByCourse = Object.values(courseRoles).includes('mentor');
          if (!(role === 'mentor' || mentorByCourse)) {
            return null;
          }

          const courses = Array.isArray(row.selected_courses)
            ? row.selected_courses.map((item: unknown) => String(item))
            : [];

          return {
            uid: String(row.uid ?? ''),
            name: String(row.name ?? 'User'),
            major: String(row.major ?? ''),
            courses,
            role: role || 'mentor',
            bio: String(row.bio ?? ''),
          } as Mentor;
        })
        .filter((item): item is Mentor => Boolean(item));

      setMentors(mentorRows);

      const connected: Record<string, boolean> = {};

      (buddiesResp.data ?? []).forEach((row) => {
        const buddyId = String((row as { buddy_id?: unknown }).buddy_id ?? '');
        if (buddyId) {
          connected[buddyId] = true;
        }
      });

      (incomingResp.data ?? [])
        .filter((row) => String((row as { status?: unknown }).status ?? '') === 'pending')
        .forEach((row) => {
          const requesterId = String((row as { requester_id?: unknown }).requester_id ?? '');
          if (requesterId) {
            connected[requesterId] = true;
          }
        });

      (outgoingResp.data ?? [])
        .filter((row) => String((row as { status?: unknown }).status ?? '') === 'pending')
        .forEach((row) => {
          const targetId = String((row as { target_id?: unknown }).target_id ?? '');
          if (targetId) {
            connected[targetId] = true;
          }
        });

      setConnectedIds(connected);
    };

    void fetch();
    const id = setInterval(() => {
      void fetch();
    }, 4000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [uid]);

  const courseOptions = myCourses;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return mentors.filter((m) => {
      const matchesSearch =
        !s ||
        m.name.toLowerCase().includes(s) ||
        m.courses.some((c) => c.toLowerCase().includes(s));
      const matchesCourseFilter =
        courseFilter === 'all' ||
        m.courses.includes(courseFilter);
      const isConnectedOrPending = Boolean(connectedIds[m.uid]);
      return matchesSearch && matchesCourseFilter && !isConnectedOrPending;
    });
  }, [mentors, search, courseFilter, connectedIds]);

  const sendRequest = async (mentor: Mentor) => {
    if (!supabase) {
      return;
    }

    const me = await getUserProfile(uid);
    const { error } = await supabase.from('friend_requests').upsert(
      {
        requester_id: uid,
        requester_name: me?.name || 'User',
        target_id: mentor.uid,
        target_name: mentor.name,
        status: 'pending',
        created_at: new Date().toISOString(),
        responded_at: null,
      },
      { onConflict: 'requester_id,target_id' },
    );

    if (error) {
      Alert.alert('Request failed', error.message);
      return;
    }

    Alert.alert('Request sent', `Follow request sent to ${mentor.name}`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Find a Mentor</Heading>
        <Subheading>Search by name or course to connect</Subheading>

        <AppInput
          placeholder="Search by name or course"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        <View style={styles.dropdownWrapper}>
          <Pressable
            style={styles.dropdown}
            onPress={() => setCoursePickerOpen((open) => !open)}
          >
            <Text style={styles.dropdownText}>
              {courseFilter === 'all' ? 'All Courses' : courseFilter}
            </Text>
            <Text style={styles.dropdownChevron}>{coursePickerOpen ? '\u25B2' : '\u25BC'}</Text>
          </Pressable>

          {coursePickerOpen ? (
            <View style={styles.dropdownMenu}>
              <Pressable
                style={styles.dropdownOption}
                onPress={() => {
                  setCourseFilter('all');
                  setCoursePickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    courseFilter === 'all' && styles.dropdownOptionTextActive,
                  ]}
                >
                  All Courses
                </Text>
              </Pressable>

              {courseOptions.map((course) => (
                <Pressable
                  key={course}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setCourseFilter(course);
                    setCoursePickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      courseFilter === course && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {course}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {filtered.map((mentor) => (
          <Card key={mentor.uid} style={styles.cardGap}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.name}>{mentor.name}</Text>
              <View style={styles.availablePill}>
                <Text style={styles.availableText}>Available</Text>
              </View>
            </View>
            <Text style={styles.meta}>{mentor.major}</Text>
            <Text style={styles.bio}>{mentor.bio || 'No bio added yet.'}</Text>
            <Text style={styles.courses}>{mentor.courses.join(' • ') || 'No course listed'}</Text>
            <View style={styles.actionsRow}>
              <View style={styles.actionPrimary}>
                <AppButton text="Send Request" variant="gold" onPress={() => void sendRequest(mentor)} />
              </View>
              <View style={styles.actionSecondary}>
                <AppButton
                  text="View Profile"
                  variant="outline"
                  onPress={() => setSelectedMentor(mentor)}
                />
              </View>
            </View>
          </Card>
        ))}

        {filtered.length === 0 ? <Text style={styles.empty}>No mentors found right now.</Text> : null}
      </ScrollView>

      <Modal
        visible={Boolean(selectedMentor)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMentor(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mentor Profile</Text>
            {selectedMentor ? (
              <>
                <Text style={styles.modalName}>{selectedMentor.name}</Text>
                <Text style={styles.modalMeta}>{selectedMentor.major || 'No major listed'}</Text>
                <Text style={styles.modalSectionTitle}>Bio</Text>
                <Text style={styles.modalBody}>{selectedMentor.bio || 'No bio added yet.'}</Text>
                <Text style={styles.modalSectionTitle}>Courses</Text>
                <Text style={styles.modalBody}>
                  {selectedMentor.courses.join(' • ') || 'No course listed'}
                </Text>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <View style={styles.actionPrimary}>
                <AppButton text="Close" variant="reject" onPress={() => setSelectedMentor(null)} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  search: {
    marginTop: 14,
    marginBottom: 10,
  },
  dropdownWrapper: {
    marginBottom: 12,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownText: {
    color: colors.textBody,
    fontWeight: '600',
  },
  dropdownChevron: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dropdownMenu: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownOptionText: {
    color: colors.textBody,
  },
  dropdownOptionTextActive: {
    color: colors.green,
    fontWeight: '700',
  },
  cardGap: {
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textStrong,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 3,
  },
  bio: {
    marginTop: 8,
    marginBottom: 8,
    color: colors.textBody,
  },
  courses: {
    marginTop: 10,
    marginBottom: 12,
    color: colors.green,
    fontWeight: '600',
  },
  availablePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.greenSoft,
  },
  availableText: {
    color: colors.green,
    fontWeight: '700',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  actionPrimary: {
    flex: 1,
  },
  actionSecondary: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalName: {
    color: colors.textStrong,
    fontSize: 20,
    fontWeight: '800',
  },
  modalMeta: {
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  modalSectionTitle: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  modalBody: {
    color: colors.textBody,
    lineHeight: 20,
  },
  modalActions: {
    marginTop: 14,
  },
});
