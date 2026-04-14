import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Major, Semester, Year } from '../lib/courseCatalog';
import { AppButton, AppInput, Badge, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';
import { useToast } from '../ui/toast';

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

type AdminReport = {
  id: string;
  reporterUid: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed';
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
  suspensionLevel: string;
  suspensionReason: string;
  suspendedUntil: string;
};

type SuspensionLevel = 'light' | 'moderate' | 'severe';

const SUSPENSION_DURATIONS_MINUTES: Record<SuspensionLevel, number> = {
  light: 24 * 60,
  moderate: 3 * 24 * 60,
  severe: 7 * 24 * 60,
};

type Props = {
  uid: string;
};

export function AdminScreen({ uid }: Props) {
  const { showToast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);

  const [newCourseName, setNewCourseName] = useState('');
  const [newMajor, setNewMajor] = useState<Major>('BSIT');
  const [newYear, setNewYear] = useState<Year>('1');
  const [newSem, setNewSem] = useState<Semester>('1');
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editMajor, setEditMajor] = useState<Major>('BSIT');
  const [editYear, setEditYear] = useState<Year>('1');
  const [editSem, setEditSem] = useState<Semester>('1');
  const [actingUserId, setActingUserId] = useState('');
  const [suspendTargetUser, setSuspendTargetUser] = useState<AdminUser | null>(null);
  const [suspendLevel, setSuspendLevel] = useState<SuspensionLevel>('light');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendingUserId, setSuspendingUserId] = useState('');
  const [actingReportId, setActingReportId] = useState('');
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [meResp, usersResp, usersListResp, coursesResp, postsResp, requestsResp, logsResp, reportsResp] = await Promise.all([
        supabase.from('users').select('is_admin').eq('uid', uid).maybeSingle(),
        supabase.from('users').select('uid', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('uid,email,name,major,year_level,is_admin,selected_courses,suspension_level,suspension_reason,suspended_until')
          .order('created_at', { ascending: false })
          .limit(250),
        supabase.from('courses').select('id,name,major,year_level,semester', { count: 'exact' }).order('major', { ascending: true }).order('year_level', { ascending: true }).order('semester', { ascending: true }).order('name', { ascending: true }),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }),
        supabase.from('friend_requests').select('id', { count: 'exact', head: true }),
        supabase.from('admin_activity_logs').select('id,action,target_type,target_id,created_at').order('created_at', { ascending: false }).limit(30),
        supabase.from('reports').select('id,reporter_uid,target_type,target_id,reason,details,status,created_at').order('created_at', { ascending: false }).limit(80),
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
          suspensionLevel: String(row.suspension_level ?? ''),
          suspensionReason: String(row.suspension_reason ?? ''),
          suspendedUntil: String(row.suspended_until ?? ''),
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

      setReports(
        (reportsResp.data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          reporterUid: String(row.reporter_uid ?? ''),
          targetType: String(row.target_type ?? ''),
          targetId: String(row.target_id ?? ''),
          reason: String(row.reason ?? ''),
          details: String(row.details ?? ''),
          status: String(row.status ?? 'open') as AdminReport['status'],
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

  const openReports = useMemo(
    () => reports.filter((item) => item.status === 'open' || item.status === 'reviewed'),
    [reports],
  );

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

              showToast('Course added successfully.', { variant: 'success' });
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

      showToast('Course deleted successfully.', { variant: 'success' });
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

    showToast('Course updated successfully.', { variant: 'success' });
    closeEditCourse();
  };

  const toggleUserAdmin = async (user: AdminUser) => {
    if (!supabase || !user.uid || user.uid === uid) {
      return;
    }

    const makeAdmin = !user.isAdmin;
    const actionWord = makeAdmin ? 'Promote' : 'Demote';
    const roleLabel = makeAdmin ? 'admin' : 'regular user';
    const prompt = `${actionWord} ${user.name || user.email || user.uid} to ${roleLabel}?`;

    const runToggle = async () => {
      if (!supabase) return;
      setActingUserId(user.uid);

      const { error } = await supabase
        .from('users')
        .update({ is_admin: makeAdmin })
        .eq('uid', user.uid);

      if (error) {
        const hint = error.message?.toLowerCase().includes('policy')
          ? ' Check RLS policy for admin user updates.'
          : '';
        Alert.alert('Unable to update role', `${error.message ?? 'Unknown error'}${hint}`);
        setActingUserId('');
        return;
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.uid === user.uid
            ? {
                ...item,
                isAdmin: makeAdmin,
              }
            : item,
        ),
      );

      await supabase.from('admin_activity_logs').insert({
        admin_uid: uid,
        action: makeAdmin ? 'user_promoted_admin' : 'user_demoted_admin',
        target_type: 'user',
        target_id: user.uid,
        details: {
          previous_is_admin: user.isAdmin,
          next_is_admin: makeAdmin,
        },
      });

      setActingUserId('');
      showToast(`${user.name || user.email || user.uid} is now ${roleLabel}.`, { variant: 'success' });
    };

    if (Platform.OS === 'web') {
      const ok = typeof globalThis.confirm === 'function' ? globalThis.confirm(prompt) : true;
      if (!ok) {
        return;
      }
      await runToggle();
      return;
    }

    Alert.alert(actionWord, prompt, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionWord,
        style: 'default',
        onPress: () => {
          void runToggle();
        },
      },
    ]);
  };

  const isSuspended = (user: AdminUser): boolean => {
    if (!user.suspendedUntil) {
      return false;
    }
    const untilTs = Date.parse(user.suspendedUntil);
    if (!Number.isFinite(untilTs)) {
      return false;
    }
    return untilTs > Date.now();
  };

  const formatSuspensionLevel = (value: string): string => {
    if (!value) {
      return 'Unknown';
    }
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  const openSuspendModal = (user: AdminUser) => {
    setSuspendTargetUser(user);
    setSuspendLevel('light');
    setSuspendReason('');
  };

  const closeSuspendModal = () => {
    setSuspendTargetUser(null);
    setSuspendLevel('light');
    setSuspendReason('');
  };

  const applySuspension = async () => {
    if (!supabase || !suspendTargetUser || !suspendReason.trim()) {
      return;
    }

    const durationMinutes = SUSPENSION_DURATIONS_MINUTES[suspendLevel];
    const untilTs = Date.now() + durationMinutes * 60 * 1000;
    const suspendedUntilIso = new Date(untilTs).toISOString();
    const target = suspendTargetUser;

    setSuspendingUserId(target.uid);

    const { error } = await supabase
      .from('users')
      .update({
        suspension_level: suspendLevel,
        suspension_reason: suspendReason.trim(),
        suspended_until: suspendedUntilIso,
      })
      .eq('uid', target.uid);

    if (error) {
      Alert.alert('Unable to suspend user', error.message);
      setSuspendingUserId('');
      return;
    }

    setUsers((prev) =>
      prev.map((item) =>
        item.uid === target.uid
          ? {
              ...item,
              suspensionLevel: suspendLevel,
              suspensionReason: suspendReason.trim(),
              suspendedUntil: suspendedUntilIso,
            }
          : item,
      ),
    );

    await supabase.from('admin_activity_logs').insert({
      admin_uid: uid,
      action: 'user_suspended',
      target_type: 'user',
      target_id: target.uid,
      details: {
        level: suspendLevel,
        reason: suspendReason.trim(),
        duration_minutes: durationMinutes,
        suspended_until: suspendedUntilIso,
      },
    });

    setSuspendingUserId('');
    closeSuspendModal();
    showToast(`${target.name || target.email || target.uid} has been suspended.`, { variant: 'success' });
  };

  const unsuspendUser = async (user: AdminUser) => {
    if (!supabase) {
      return;
    }

    const prompt = `Unsuspend ${user.name || user.email || user.uid}?`;

    const runUnsuspend = async () => {
      if (!supabase) return;
      setSuspendingUserId(user.uid);

      const { error } = await supabase
        .from('users')
        .update({
          suspension_level: '',
          suspension_reason: '',
          suspended_until: null,
        })
        .eq('uid', user.uid);

      if (error) {
        Alert.alert('Unable to unsuspend user', error.message);
        setSuspendingUserId('');
        return;
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.uid === user.uid
            ? {
                ...item,
                suspensionLevel: '',
                suspensionReason: '',
                suspendedUntil: '',
              }
            : item,
        ),
      );

      await supabase.from('admin_activity_logs').insert({
        admin_uid: uid,
        action: 'user_unsuspended',
        target_type: 'user',
        target_id: user.uid,
        details: {
          previous_level: user.suspensionLevel,
          previous_reason: user.suspensionReason,
          previous_until: user.suspendedUntil,
        },
      });

      setSuspendingUserId('');
      showToast(`${user.name || user.email || user.uid} can access the app again.`, { variant: 'success' });
    };

    if (Platform.OS === 'web') {
      const ok = typeof globalThis.confirm === 'function' ? globalThis.confirm(prompt) : true;
      if (!ok) {
        return;
      }
      await runUnsuspend();
      return;
    }

    Alert.alert('Unsuspend user', prompt, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsuspend',
        style: 'default',
        onPress: () => {
          void runUnsuspend();
        },
      },
    ]);
  };

  const updateReportStatus = async (report: AdminReport, nextStatus: AdminReport['status']) => {
    if (!supabase) {
      return;
    }

    setActingReportId(report.id);

    const { error } = await supabase
      .from('reports')
      .update({
        status: nextStatus,
        resolved_by: nextStatus === 'resolved' || nextStatus === 'dismissed' ? uid : null,
        resolved_at:
          nextStatus === 'resolved' || nextStatus === 'dismissed'
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    if (error) {
      Alert.alert('Unable to update report', error.message);
      setActingReportId('');
      return;
    }

    setReports((prev) =>
      prev.map((item) =>
        item.id === report.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item,
      ),
    );

    setSelectedReport((prev) =>
      prev && prev.id === report.id
        ? {
            ...prev,
            status: nextStatus,
          }
        : prev,
    );

    await supabase.from('admin_activity_logs').insert({
      admin_uid: uid,
      action: 'report_status_updated',
      target_type: 'report',
      target_id: report.id,
      details: {
        previous_status: report.status,
        next_status: nextStatus,
      },
    });

    setActingReportId('');
    showToast(`Report marked as ${nextStatus}.`, { variant: 'success' });
  };

  const openReportReview = (report: AdminReport) => {
    setSelectedReport(report);
  };

  const closeReportReview = () => {
    if (actingReportId) {
      return;
    }
    setSelectedReport(null);
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
              <View style={styles.userList}>
                {filteredUsers.map((user) => (
                  <View key={user.uid} style={styles.userCard}>
                    <View style={styles.userTopRow}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userIdentity}>
                        <Text style={styles.userName}>{user.name || 'Unnamed User'}</Text>
                        <Text style={styles.userEmail}>{user.email || user.uid}</Text>
                      </View>
                      <View style={styles.userColAction}>
                        <View style={styles.userActionWrap}>
                          <AppButton
                            text={actingUserId === user.uid ? 'Saving...' : user.isAdmin ? 'Demote' : 'Promote'}
                            variant={user.isAdmin ? 'outline' : 'blue'}
                            disabled={user.uid === uid || actingUserId === user.uid || suspendingUserId === user.uid}
                            onPress={() => void toggleUserAdmin(user)}
                          />
                          <AppButton
                            text={
                              suspendingUserId === user.uid
                                ? 'Saving...'
                                : isSuspended(user)
                                  ? 'Unsuspend'
                                  : 'Suspend'
                            }
                            variant={isSuspended(user) ? 'outline' : 'danger'}
                            disabled={user.uid === uid || actingUserId === user.uid || suspendingUserId === user.uid}
                            onPress={() =>
                              isSuspended(user)
                                ? void unsuspendUser(user)
                                : openSuspendModal(user)
                            }
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.userMetaRow}>
                      <View style={[styles.userPill, user.isAdmin ? styles.userPillAdmin : styles.userPillUser]}>
                        <Text style={[styles.userPillText, user.isAdmin ? styles.userPillTextAdmin : styles.userPillTextUser]}>
                          {user.isAdmin ? 'Admin' : 'User'}
                        </Text>
                      </View>
                      <View style={styles.userPill}>
                        <Text style={styles.userPillText}>Major: {user.major || 'N/A'}</Text>
                      </View>
                      <View style={styles.userPill}>
                        <Text style={styles.userPillText}>Year: {user.yearLevel || 'N/A'}</Text>
                      </View>
                      <View style={styles.userPill}>
                        <Text style={styles.userPillText}>Courses: {user.selectedCoursesCount}</Text>
                      </View>
                      {isSuspended(user) ? (
                        <View style={[styles.userPill, styles.userPillSuspended]}>
                          <Text style={[styles.userPillText, styles.userPillTextSuspended]}>
                            Suspended {formatSuspensionLevel(user.suspensionLevel)} until {new Date(user.suspendedUntil).toLocaleString()}
                          </Text>
                        </View>
                      ) : null}
                      {isSuspended(user) && user.suspensionReason ? (
                        <View style={[styles.userPill, styles.userPillSuspended]}> 
                          <Text style={[styles.userPillText, styles.userPillTextSuspended]}>
                            Reason: {user.suspensionReason}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              {filteredUsers.length === 0 ? (
                <Text style={styles.logMeta}>No users match your search.</Text>
              ) : null}
            </ScrollView>
          </View>
        </Card>

        <Card>
          <Text style={styles.section}>Reports</Text>
          {openReports.map((report) => (
            <Pressable key={report.id} style={styles.reportRow} onPress={() => openReportReview(report)}>
              <Text style={styles.reportTitle}>
                {report.targetType.toUpperCase()} report • {report.reason}
              </Text>
              <Text style={styles.logMeta}>Target: {report.targetId}</Text>
              <Text style={styles.logMeta}>Reporter: {report.reporterUid}</Text>
              {report.details ? <Text style={styles.logMeta}>Details: {report.details}</Text> : null}
              <Text style={styles.logMeta}>Status: {report.status}</Text>
              <Text style={styles.logMeta}>{new Date(report.createdAt).toLocaleString()}</Text>

              <View style={styles.reportActionsRow}>
                <View style={styles.reportActionBtn}>
                  <AppButton
                    text="Review"
                    variant="outline"
                    onPress={() => openReportReview(report)}
                  />
                </View>
              </View>
            </Pressable>
          ))}
          {openReports.length === 0 ? <Text style={styles.logMeta}>No open reports.</Text> : null}
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

      <Modal
        visible={Boolean(suspendTargetUser)}
        transparent
        animationType="fade"
        onRequestClose={closeSuspendModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.section}>Suspend User</Text>
            <Text style={styles.logMeta}>
              {suspendTargetUser?.name || suspendTargetUser?.email || suspendTargetUser?.uid}
            </Text>

            <View style={styles.inlineRow}>
              {(['light', 'moderate', 'severe'] as SuspensionLevel[]).map((level) => (
                <Pressable key={`suspend-${level}`} onPress={() => setSuspendLevel(level)}>
                  <Badge
                    text={`${formatSuspensionLevel(level)} (${Math.round(SUSPENSION_DURATIONS_MINUTES[level] / (24 * 60))}d)`}
                    active={suspendLevel === level}
                  />
                </Pressable>
              ))}
            </View>

            <AppInput
              value={suspendReason}
              onChangeText={setSuspendReason}
              placeholder="Suspension reason"
            />

            <View style={styles.modalActionsRow}>
              <View style={styles.modalActionItem}>
                <AppButton text="Cancel" variant="outline" onPress={closeSuspendModal} />
              </View>
              <View style={styles.modalActionItem}>
                <AppButton
                  text={suspendingUserId ? 'Saving...' : 'Confirm'}
                  variant="danger"
                  disabled={!suspendReason.trim() || Boolean(suspendingUserId)}
                  onPress={() => void applySuspension()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedReport)}
        transparent
        animationType="fade"
        onRequestClose={closeReportReview}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.section}>Report Review</Text>
            {selectedReport ? (
              <>
                <Text style={styles.logMeta}>Type: {selectedReport.targetType}</Text>
                <Text style={styles.logMeta}>Target ID: {selectedReport.targetId}</Text>
                <Text style={styles.logMeta}>Reporter: {selectedReport.reporterUid}</Text>
                <Text style={styles.logMeta}>Created: {new Date(selectedReport.createdAt).toLocaleString()}</Text>
                <Text style={styles.logMeta}>Status: {selectedReport.status}</Text>

                <Text style={styles.reportModalLabel}>Reason</Text>
                <Text style={styles.reportModalBody}>{selectedReport.reason}</Text>

                <Text style={styles.reportModalLabel}>Details</Text>
                <Text style={styles.reportModalBody}>{selectedReport.details || 'No additional details.'}</Text>

                <View style={styles.reportModalActionsRow}>
                  <View style={styles.reportActionBtn}>
                    <AppButton
                      text={actingReportId === selectedReport.id ? 'Saving...' : 'Mark Reviewed'}
                      variant="outline"
                      disabled={actingReportId === selectedReport.id || selectedReport.status === 'reviewed'}
                      onPress={() => void updateReportStatus(selectedReport, 'reviewed')}
                    />
                  </View>
                  <View style={styles.reportActionBtn}>
                    <AppButton
                      text={actingReportId === selectedReport.id ? 'Saving...' : 'Resolve'}
                      variant="blue"
                      disabled={actingReportId === selectedReport.id || selectedReport.status === 'resolved'}
                      onPress={() => void updateReportStatus(selectedReport, 'resolved')}
                    />
                  </View>
                </View>

                <View style={styles.reportModalActionsRow}>
                  <View style={styles.reportActionBtn}>
                    <AppButton
                      text={actingReportId === selectedReport.id ? 'Saving...' : 'Dismiss'}
                      variant="reject"
                      disabled={actingReportId === selectedReport.id || selectedReport.status === 'dismissed'}
                      onPress={() => void updateReportStatus(selectedReport, 'dismissed')}
                    />
                  </View>
                  <View style={styles.reportActionBtn}>
                    <AppButton
                      text="Close"
                      variant="gold"
                      disabled={Boolean(actingReportId)}
                      onPress={closeReportReview}
                    />
                  </View>
                </View>
              </>
            ) : null}
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
  userList: {
    gap: 10,
  },
  userCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.white,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: colors.green,
    fontWeight: '800',
    fontSize: 16,
  },
  userIdentity: {
    flex: 1,
    minWidth: 0,
  },
  userMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  userPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
  },
  userPillAdmin: {
    borderColor: '#93c5fd',
    backgroundColor: '#dbeafe',
  },
  userPillUser: {
    borderColor: '#bbf7d0',
    backgroundColor: '#dcfce7',
  },
  userPillText: {
    color: colors.textBody,
    fontSize: 11,
    fontWeight: '600',
  },
  userPillTextAdmin: {
    color: '#1d4ed8',
  },
  userPillTextUser: {
    color: '#166534',
  },
  userPillSuspended: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  userPillTextSuspended: {
    color: '#b91c1c',
  },
  userColAction: {
    width: 128,
  },
  userActionWrap: {
    minWidth: 120,
    alignSelf: 'center',
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
  reportRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  reportTitle: {
    fontWeight: '700',
    color: colors.textStrong,
  },
  reportActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  reportModalLabel: {
    marginTop: 8,
    marginBottom: 4,
    color: colors.textStrong,
    fontWeight: '700',
  },
  reportModalBody: {
    color: colors.textBody,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
  },
  reportModalActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  reportActionBtn: {
    flex: 1,
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
