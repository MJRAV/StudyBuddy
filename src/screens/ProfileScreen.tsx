import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getUserProfile, supabase } from '../lib/supabase';
import { uploadProfilePicture } from '../lib/userService';
import { AppButton, AppInput, Card, Heading, Label, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type Props = {
  uid: string;
  onLogout: () => Promise<void> | void;
  onOpenAdmin: () => void;
  onManageCourses: () => void;
};

export function ProfileScreen({ uid, onLogout, onOpenAdmin, onManageCourses }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [major, setMajor] = useState('');
  const [yearLevel, setYearLevel] = useState('1');
  const [semester, setSemester] = useState('1');
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [buddyCount, setBuddyCount] = useState(0);
  const [mentorCourses, setMentorCourses] = useState(0);
  const [courseRoles, setCourseRoles] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!supabase) return;

      const profile = await getUserProfile(uid);

      const [userResp, buddiesResp] = await Promise.all([
        supabase
          .from('users')
          .select('bio,major,year_level,semester,is_admin,avatar_url,course_roles,email')
          .eq('uid', uid)
          .maybeSingle(),
        supabase.from('buddies').select('buddy_id').eq('owner_id', uid),
      ]);

      if (!isMounted) return;

      const userRow = userResp.data ?? null;

      setName(profile?.name || 'User');
      setEmail(String(userRow?.email ?? profile?.email ?? ''));
      setBio(String(userRow?.bio ?? ''));
      setMajor(String(userRow?.major ?? ''));
      setYearLevel(String(userRow?.year_level ?? '1'));
      setSemester(String(userRow?.semester ?? '1'));
      setIsAdmin(Boolean(userRow?.is_admin));
      setAvatarUrl(
        typeof userRow?.avatar_url === 'string'
          ? userRow.avatar_url
          : profile?.avatarUrl ?? null,
      );
      setBuddyCount(buddiesResp.data?.length ?? 0);

      const roles = (userRow?.course_roles ?? {}) as Record<string, string>;
      setCourseRoles(roles);
      setMentorCourses(Object.values(roles).filter((v) => v === 'mentor').length);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [uid]);

  const saveProfile = async () => {
    if (!supabase) return;

    const { error } = await supabase
      .from('users')
      .update({
        name,
        bio,
        major,
        year_level: yearLevel,
        semester,
        updated_at: new Date().toISOString(),
      })
      .eq('uid', uid);

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    setIsEditing(false);
    Alert.alert('Saved', 'Profile updated.');
  };

  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0]?.uri;
      if (!uri) return;

      const url = await uploadProfilePicture(uid, uri);
      setAvatarUrl(url);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Could not upload profile picture.');
    }
  };

  const initials = useMemo(() => {
    if (!name) return 'SB';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }, [name]);

  const mentorCourseNames = useMemo(
    () => Object.entries(courseRoles).filter(([, role]) => role === 'mentor').map(([course]) => course),
    [courseRoles],
  );

  const menteeCourseNames = useMemo(
    () => Object.entries(courseRoles).filter(([, role]) => role === 'mentee').map(([course]) => course),
    [courseRoles],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Profile</Heading>
        <Subheading>View and edit your StudyBuddy details</Subheading>

        <Card style={styles.topCard}>
          <View style={styles.topRow}>
            <Text style={styles.cardTitle}>Profile</Text>
            {!isEditing ? (
              <AppButton text="Edit" variant="outline" onPress={() => setIsEditing(true)} />
            ) : (
              <View style={styles.editButtonRow}>
                <View style={styles.editButtonWrap}>
                  <AppButton text="Cancel" variant="outline" onPress={() => setIsEditing(false)} />
                </View>
                <View style={styles.editButtonWrap}>
                  <AppButton text="Save" onPress={() => void saveProfile()} />
                </View>
              </View>
            )}
          </View>

          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            {isEditing ? (
              <AppButton text="Change photo" variant="outline" onPress={handleChangePhoto} />
            ) : null}
          </View>

          {isEditing ? (
            <>
              <Label>Name</Label>
              <AppInput value={name} onChangeText={setName} />

              <Label>Bio</Label>
              <AppInput value={bio} onChangeText={setBio} style={styles.bioInput} multiline />

              <Label>Major</Label>
              <AppInput value={major} onChangeText={setMajor} />

              <Label>Year Level</Label>
              <AppInput value={yearLevel} onChangeText={setYearLevel} />

              <Label>Semester</Label>
              <AppInput value={semester} onChangeText={setSemester} style={styles.noMargin} />
            </>
          ) : (
            <>
              <Text style={styles.profileName}>{name}</Text>
              {email ? <Text style={styles.profileEmail}>{email}</Text> : null}

              <View style={styles.pillsRow}>
                <View style={[styles.pill, styles.pillOutline]}>
                  <Text style={styles.pillLabel}>
                    {buddyCount} {buddyCount === 1 ? 'Buddy' : 'Buddies'}
                  </Text>
                </View>
                <View style={[styles.pill, styles.pillGreen]}>
                  <Text style={styles.pillLabelGreen}>
                    Mentor in {mentorCourses || 0} course{mentorCourses === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {!isEditing ? (
          <>
            <Card style={styles.cardGap}>
              <Text style={styles.sectionTitle}>About Me</Text>
              <Text style={styles.sectionBody}>{bio || 'No bio added yet. Tap edit to add one!'}</Text>
            </Card>

            <Card style={styles.cardGap}>
              <Text style={styles.sectionTitle}>Academic Information</Text>
              <Text style={styles.fieldLabel}>Year Level</Text>
              <Text style={styles.fieldValue}>Year {yearLevel}</Text>

              <Text style={styles.fieldLabel}>Major/Program</Text>
              <Text style={styles.fieldValue}>{major || 'Not set'}</Text>
            </Card>

            <Card style={styles.cardGap}>
              <Text style={styles.sectionTitle}>My Courses</Text>
              {mentorCourseNames.length > 0 || menteeCourseNames.length > 0 ? (
                <>
                  {mentorCourseNames.length > 0 ? (
                    <View style={styles.courseRoleBlock}>
                      <Text style={styles.courseRoleLabel}>As Mentor</Text>
                      <View style={styles.courseChipsRow}>
                        {mentorCourseNames.map((course) => (
                          <View key={course} style={[styles.courseChip, styles.courseChipMentor]}>
                            <Text style={styles.courseChipTextMentor}>{course}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {menteeCourseNames.length > 0 ? (
                    <View style={styles.courseRoleBlock}>
                      <Text style={styles.courseRoleLabel}>As Mentee</Text>
                      <View style={styles.courseChipsRow}>
                        {menteeCourseNames.map((course) => (
                          <View key={course} style={[styles.courseChip, styles.courseChipMentee]}>
                            <Text style={styles.courseChipTextMentee}>{course}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.sectionBody}>
                  No courses selected yet. Use "Manage Courses" to add courses.
                </Text>
              )}

              <View style={styles.manageCoursesButtonWrap}>
                <AppButton text="Manage Courses" variant="link" onPress={onManageCourses} />
              </View>
            </Card>
          </>
        ) : null}

        {isAdmin ? (
          <View style={styles.inlineButtonGap}>
            <AppButton text="Open Admin Panel" variant="blue" onPress={onOpenAdmin} />
          </View>
        ) : null}

        <View style={styles.inlineButtonGap}>
          <AppButton text="Logout" variant="danger" onPress={() => void onLogout()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  topCard: {
    marginTop: 14,
    marginBottom: 10,
  },
  cardGap: {
    marginTop: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textStrong,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textStrong,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.textStrong,
    marginBottom: 2,
  },
  profileEmail: {
    textAlign: 'center',
    color: colors.textBody,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillOutline: {
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.white,
  },
  pillGreen: {
    backgroundColor: colors.greenSoft,
  },
  pillLabel: {
    color: colors.blue,
    fontWeight: '600',
    fontSize: 12,
  },
  pillLabelGreen: {
    color: colors.green,
    fontWeight: '600',
    fontSize: 12,
  },
  bioInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  noMargin: {
    marginBottom: 0,
  },
  inlineButtonGap: {
    marginTop: 8,
    alignSelf: 'flex-start',
    minWidth: 170,
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editButtonWrap: {
    minWidth: 80,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 6,
  },
  sectionBody: {
    color: colors.textBody,
  },
  fieldLabel: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
  },
  fieldValue: {
    color: colors.textStrong,
    fontWeight: '700',
    marginTop: 2,
  },
  courseRoleBlock: {
    marginTop: 8,
    marginBottom: 4,
  },
  courseRoleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  courseChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  courseChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  courseChipMentor: {
    backgroundColor: colors.greenSoft,
    borderColor: '#6ee7b7',
  },
  courseChipMentee: {
    backgroundColor: '#ecfdf3',
    borderColor: '#bbf7d0',
  },
  courseChipTextMentor: {
    color: colors.green,
    fontWeight: '600',
    fontSize: 12,
  },
  courseChipTextMentee: {
    color: colors.textBody,
    fontWeight: '600',
    fontSize: 12,
  },
  manageCoursesButtonWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
});
