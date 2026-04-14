import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Major, Semester, Year } from '../lib/courseCatalog';
import { AppButton, AppInput, Badge, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type AdminCourse = {
  id: string;
  name: string;
  major: string;
  yearLevel: string;
  semester: string;
};

type AdminLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

type AdminUser = {
  uid: string;
  email: string;
  name: string;
  major: string;
  yearLevel: string;
  isAdmin: boolean;
  selectedCoursesCount: number;
};

type Props = {
  uid: string;
};

export function AdminScreen({ uid }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [logs, setLogs] = useState<AdminLog[]>([]);

  const [newCourseName, setNewCourseName] = useState('');
  const [newMajor, setNewMajor] = useState<Major>('BSIT');
  const [newYear, setNewYear] = useState<Year>('1');
  const [newSem, setNewSem] = useState<Semester>('1');
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editMajor, setEditMajor] = useState<Major>('BSIT');
  const [editYear, setEditYear] = useState<Year>('1');
  const [editSem, setEditSem] = useState<Semester>('1');

  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [meResp, usersResp, usersListResp, coursesResp, postsResp, requestsResp, logsResp] = await Promise.all([
        supabase.from('users').select('is_admin').eq('uid', uid).maybeSingle(),
        supabase.from('users').select('uid', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('uid,email,name,major,year_level,is_admin,selected_courses')
          .order('created_at', { ascending: false })
          .limit(250),
        supabase.from('courses').select('id,name,major,year_level,semester', { count: 'exact' }).order('major', { ascending: true }).order('year_level', { ascending: true }).order('semester', { ascending: true }).order('name', { ascending: true }),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }),
        supabase.from('friend_requests').select('id', { count: 'exact', head: true }),
        supabase.from('admin_activity_logs').select('id,action,target_type,target_id,created_at').order('created_at', { ascending: false }).limit(30),
      ]);

      if (!active || meResp.error) {
        return;
      }

      const admin = Boolean(meResp.data?.is_admin);
      setIsAdmin(admin);
      if (!admin) {
        return;
      }

      setUsersCount(usersResp.count ?? 0);
      setPostsCount(postsResp.count ?? 0);
      setRequestsCount(requestsResp.count ?? 0);

      setUsers(
        (usersListResp.data ?? []).map((row) => ({
          uid: String(row.uid ?? ''),
          email: String(row.email ?? ''),
          name: String(row.name ?? ''),
          major: String(row.major ?? ''),
          yearLevel: String(row.year_level ?? ''),
          isAdmin: Boolean(row.is_admin ?? false),
          selectedCoursesCount: Array.isArray(row.selected_courses) ? row.selected_courses.length : 0,
        })),
      );

      setCourses(
        (coursesResp.data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          name: String(row.name ?? ''),
          major: String(row.major ?? ''),
          yearLevel: String(row.year_level ?? ''),
          semester: String(row.semester ?? ''),
        })),
      );

      setLogs(
        (logsResp.data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          action: String(row.action ?? ''),
          targetType: String(row.target_type ?? ''),
          targetId: String(row.target_id ?? ''),
          createdAt: String(row.created_at ?? ''),
        })),
      );
    };

    void fetch();
    const id = setInterval(() => {
      void fetch();
    }, 5000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [uid]);

  const filteredCourses = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) {
      return courses;
    }
    return courses.filter((c) => c.name.toLowerCase().includes(s));
  }, [courses, search]);

  const filteredUsers = useMemo(() => {
    const s = userSearch.trim().toLowerCase();
    if (!s) {
      return users;
    }
    return users.filter((u) => {
      return (
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.major.toLowerCase().includes(s) ||
        u.yearLevel.toLowerCase().includes(s)
      );
    });
  }, [users, userSearch]);

  const addCourse = async () => {
    if (!supabase || !newCourseName.trim()) {
      return;
    }

    const summary = `${newMajor} • Year ${newYear} • Sem ${newSem}`;

    Alert.alert(
      'Add course',
      `Add "${newCourseName.trim()}" (${summary})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          style: 'default',
          onPress: () => {
            void (async () => {
              if (!supabase) return;

              const { data, error } = await supabase
                .from('courses')
                .insert({
                  name: newCourseName.trim(),
                  major: newMajor,
                  year_level: newYear,
                  semester: newSem,
                  created_at: new Date().toISOString(),
                })
                .select('id,name,major,year_level,semester')
                .single();

              if (error) {
                Alert.alert('Unable to add', error.message);
                return;
              }

              const inserted: AdminCourse = {
                id: String(data.id ?? ''),
                name: String(data.name ?? ''),
                major: String(data.major ?? ''),
                yearLevel: String(data.year_level ?? ''),
                semester: String(data.semester ?? ''),
              };

              setCourses((prev) => [...prev, inserted]);
              setNewCourseName('');

              await supabase.from('admin_activity_logs').insert({
                admin_uid: uid,
                action: 'course_created',
                target_type: 'course',
                target_id: inserted.id,
                details: inserted,
              });

              Alert.alert('Course added', 'The course has been created.');
            })();
          },
        },
      ],
    );
  };

  const deleteCourse = async (course: AdminCourse) => {
    if (!supabase) {
      return;
    }

    const summary = `${course.major} • Year ${course.yearLevel} • Sem ${course.semester}`;
    const prompt = `Remove "${course.name}" (${summary})? This cannot be undone.`;

    const runDelete = async () => {
      if (!supabase) return;

      const { error } = await supabase.from('courses').delete().eq('id', course.id);
      if (error) {
        Alert.alert('Unable to delete', error.message);
        return;
      }

      setCourses((prev) => prev.filter((c) => c.id !== course.id));

      await supabase.from('admin_activity_logs').insert({
        admin_uid: uid,
        action: 'course_deleted',
        target_type: 'course',
        target_id: course.id,
        details: course,
      });

      Alert.alert('Course deleted', 'The course has been removed.');
    };

    if (Platform.OS === 'web') {
      const ok = typeof globalThis.confirm === 'function' ? globalThis.confirm(prompt) : true;
      if (!ok) {
        return;
      }
      await runDelete();
      return;
    }

    Alert.alert(
      'Delete course',
      prompt,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void runDelete();
          },
        },
      ],
    );
  };

  const openEditCourse = (course: AdminCourse) => {
    setEditingCourse(course);
    setEditCourseName(course.name);
    setEditMajor((['BSIT', 'BSCS', 'BSIS'] as Major[]).includes(course.major as Major) ? (course.major as Major) : 'BSIT');
    setEditYear((['1', '2', '3', '4'] as Year[]).includes(course.yearLevel as Year) ? (course.yearLevel as Year) : '1');
    setEditSem((['1', '2'] as Semester[]).includes(course.semester as Semester) ? (course.semester as Semester) : '1');
  };

  const closeEditCourse = () => {
    setEditingCourse(null);
    setEditCourseName('');
    setEditMajor('BSIT');
    setEditYear('1');
    setEditSem('1');
  };

  const saveEditedCourse = async () => {
    if (!supabase || !editingCourse || !editCourseName.trim()) {
      return;
    }

    const nextCourse: AdminCourse = {
      ...editingCourse,
      name: editCourseName.trim(),
      major: editMajor,
      yearLevel: editYear,
      semester: editSem,
    };

    const { error } = await supabase
      .from('courses')
      .update({
        name: nextCourse.name,
        major: nextCourse.major,
        year_level: nextCourse.yearLevel,
        semester: nextCourse.semester,
      })
      .eq('id', editingCourse.id);

    if (error) {
      Alert.alert('Unable to update', error.message);
      return;
    }

    setCourses((prev) => prev.map((c) => (c.id === nextCourse.id ? nextCourse : c)));

    await supabase.from('admin_activity_logs').insert({
      admin_uid: uid,
      action: 'course_updated',
      target_type: 'course',
      target_id: nextCourse.id,
      details: {
        before: editingCourse,
        after: nextCourse,
      },
    });

    Alert.alert('Course updated', 'Course details were saved.');
    closeEditCourse();
  };

  if (!isAdmin) {
    return (
      <Screen style={styles.blockedWrap}>
        <Card>
          <Heading>Admin access required</Heading>
          <Subheading>Ask an admin to set users.is_admin = true for your account.</Subheading>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Admin Panel</Heading>
        <Subheading>Manage platform data, courses, and system activity</Subheading>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}><Text style={styles.statLabel}>Users</Text><Text style={styles.statValue}>{usersCount}</Text></Card>
          <Card style={styles.statCard}><Text style={styles.statLabel}>Courses</Text><Text style={styles.statValue}>{courses.length}</Text></Card>
          <Card style={styles.statCard}><Text style={styles.statLabel}>Posts</Text><Text style={styles.statValue}>{postsCount}</Text></Card>
          <Card style={styles.statCard}><Text style={styles.statLabel}>Requests</Text><Text style={styles.statValue}>{requestsCount}</Text></Card>
        </View>

        <Card style={styles.cardGap}>
          <Text style={styles.section}>Course Management</Text>
          <AppInput value={newCourseName} onChangeText={setNewCourseName} placeholder="Course name" />
          <View style={styles.inlineRow}>
            {(['BSIT', 'BSCS', 'BSIS'] as Major[]).map((m) => (
              <Pressable key={m} onPress={() => setNewMajor(m)}>
                <Badge text={m} active={newMajor === m} />
              </Pressable>
            ))}
          </View>
          <View style={styles.inlineRow}>
            {(['1', '2', '3', '4'] as Year[]).map((y) => (
              <Pressable key={y} onPress={() => setNewYear(y)}>
                <Badge text={`Y${y}`} active={newYear === y} />
              </Pressable>
            ))}
            {(['1', '2'] as Semester[]).map((s) => (
              <Pressable key={s} onPress={() => setNewSem(s)}>
                <Badge text={`S${s}`} active={newSem === s} />
              </Pressable>
            ))}
          </View>
          <View style={styles.actionRow}>
            <AppButton text="Add Course" variant="gold" onPress={() => void addCourse()} />
          </View>
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.section}>Courses</Text>
          <AppInput value={search} onChangeText={setSearch} placeholder="Search courses" />
          <View style={styles.coursesContainer}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={styles.coursesGrid}
            >
              {filteredCourses.map((course) => (
                <View key={course.id} style={styles.courseTile}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseMeta}>
                    {course.major} • Year {course.yearLevel} • Sem {course.semester}
                  </Text>
                  <View style={styles.courseActionsRow}>
                    <View style={styles.courseActionItem}>
                      <AppButton
                        text="Edit"
                        variant="blue"
                        onPress={() => openEditCourse(course)}
                      />
                    </View>
                    <View style={styles.courseActionItem}>
                    <AppButton
                      text="Delete"
                      variant="danger"
                      onPress={() => void deleteCourse(course)}
                    />
                    </View>
                  </View>
                </View>
              ))}
              {filteredCourses.length === 0 ? (
                <Text style={styles.logMeta}>No courses match your search.</Text>
              ) : null}
            </ScrollView>
          </View>
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.section}>Users</Text>
          <AppInput
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder="Search users by name, email, major, year"
          />
          <View style={styles.usersContainer}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              <View style={styles.userHeaderRow}>
                <Text style={[styles.userCol, styles.userColMain]}>User</Text>
                <Text style={[styles.userCol, styles.userColMajor]}>Major/Year</Text>
                <Text style={[styles.userCol, styles.userColRole]}>Role</Text>
                <Text style={[styles.userCol, styles.userColCourses]}>Courses</Text>
              </View>

              {filteredUsers.map((user) => (
                <View key={user.uid} style={styles.userRow}>
                  <View style={styles.userColMain}>
                    <Text style={styles.userName}>{user.name || 'Unnamed User'}</Text>
                    <Text style={styles.userEmail}>{user.email || user.uid}</Text>
                  </View>
                  <Text style={[styles.userCol, styles.userColMajor]}>
                    {(user.major || 'N/A') + ' • Y' + (user.yearLevel || 'N/A')}
                  </Text>
                  <Text style={[styles.userCol, styles.userColRole]}>{user.isAdmin ? 'Admin' : 'User'}</Text>
                  <Text style={[styles.userCol, styles.userColCourses]}>{user.selectedCoursesCount}</Text>
                </View>
              ))}

              {filteredUsers.length === 0 ? (
                <Text style={styles.logMeta}>No users match your search.</Text>
              ) : null}
            </ScrollView>
          </View>
        </Card>

        <Card>
          <Text style={styles.section}>Activity Log</Text>
          {logs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logAction}>{log.action}</Text>
              <Text style={styles.logMeta}>{log.targetType}{log.targetId ? `/${log.targetId}` : ''}</Text>
              <Text style={styles.logMeta}>{new Date(log.createdAt).toLocaleString()}</Text>
            </View>
          ))}
          {logs.length === 0 ? <Text style={styles.logMeta}>No activity yet.</Text> : null}
        </Card>
      </ScrollView>

      <Modal
        visible={Boolean(editingCourse)}
        transparent
        animationType="fade"
        onRequestClose={closeEditCourse}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.section}>Edit Course</Text>
            <AppInput
              value={editCourseName}
              onChangeText={setEditCourseName}
              placeholder="Course name"
            />
            <View style={styles.inlineRow}>
              {(['BSIT', 'BSCS', 'BSIS'] as Major[]).map((m) => (
                <Pressable key={`edit-major-${m}`} onPress={() => setEditMajor(m)}>
                  <Badge text={m} active={editMajor === m} />
                </Pressable>
              ))}
            </View>
            <View style={styles.inlineRow}>
              {(['1', '2', '3', '4'] as Year[]).map((y) => (
                <Pressable key={`edit-year-${y}`} onPress={() => setEditYear(y)}>
                  <Badge text={`Y${y}`} active={editYear === y} />
                </Pressable>
              ))}
              {(['1', '2'] as Semester[]).map((s) => (
                <Pressable key={`edit-sem-${s}`} onPress={() => setEditSem(s)}>
                  <Badge text={`S${s}`} active={editSem === s} />
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActionsRow}>
              <View style={styles.modalActionItem}>
                <AppButton text="Cancel" variant="outline" onPress={closeEditCourse} />
              </View>
              <View style={styles.modalActionItem}>
                <AppButton text="Save" variant="blue" onPress={() => void saveEditedCourse()} />
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
    paddingBottom: 26,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  statCard: {
    minWidth: '48%',
    padding: 10,
  },
  statLabel: {
    color: colors.textMuted,
  },
  statValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textStrong,
  },
  cardGap: {
    marginBottom: 10,
  },
  section: {
    fontWeight: '800',
    fontSize: 17,
    color: colors.textStrong,
    marginBottom: 10,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  actionRow: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  coursesContainer: {
    maxHeight: 420,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 8,
    backgroundColor: '#f9fafb',
  },
  usersContainer: {
    maxHeight: 340,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 8,
    backgroundColor: '#f9fafb',
  },
  userHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    marginBottom: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  userCol: {
    color: colors.textBody,
    fontSize: 12,
  },
  userColMain: {
    flex: 2,
  },
  userColMajor: {
    flex: 1.3,
  },
  userColRole: {
    flex: 1,
    fontWeight: '700',
  },
  userColCourses: {
    flex: 0.7,
    textAlign: 'right',
    fontWeight: '700',
  },
  userName: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  userEmail: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  coursesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    paddingBottom: 4,
  },
  courseTile: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.white,
  },
  courseName: {
    fontWeight: '700',
    color: colors.textStrong,
  },
  courseMeta: {
    color: colors.textMuted,
    marginTop: 3,
  },
  courseActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  courseActionItem: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 14,
  },
  modalActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  modalActionItem: {
    flex: 1,
  },
  logRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  logAction: {
    fontWeight: '700',
    color: colors.textStrong,
  },
  logMeta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  blockedWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
});
