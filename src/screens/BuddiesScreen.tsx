import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { AppButton, AppInput, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type Buddy = {
  uid: string;
  name: string;
  role: string;
  courses: string[];
};

type StudyGroup = {
  id: string;
  name: string;
  course: string;
  memberCount: number;
  nextSession: string;
};

type Props = { uid: string };

export function BuddiesScreen({ uid }: Props) {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [hiddenBuddyIds, setHiddenBuddyIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupCourse, setGroupCourse] = useState('');
  const [tab, setTab] = useState<'buddies' | 'groups'>('buddies');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [buddiesResp, groupsResp] = await Promise.all([
        supabase
          .from('buddies')
          .select('buddy_id,name,role,courses')
          .eq('owner_id', uid)
          .order('added_at', { ascending: false }),
        supabase
          .from('study_groups')
          .select('id,name,course,member_count,next_session,member_ids')
          .contains('member_ids', [uid])
          .order('updated_at', { ascending: false }),
      ]);

      if (!active || buddiesResp.error || groupsResp.error) {
        return;
      }

      const fromTable: Buddy[] = (buddiesResp.data ?? []).map((row) => ({
        uid: String(row.buddy_id ?? ''),
        name: String(row.name ?? 'Buddy'),
        role: String(row.role ?? 'Member'),
        courses: Array.isArray(row.courses) ? row.courses.map((item: unknown) => String(item)) : [],
      }));

      setBuddies(fromTable);

      setGroups(
        (groupsResp.data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          name: String(row.name ?? 'Study Group'),
          course: String(row.course ?? 'General'),
          memberCount: Number(row.member_count ?? 1),
          nextSession: String(row.next_session ?? 'TBD'),
        })),
      );
    };

    void fetch();
    const id = setInterval(() => {
      void fetch();
    }, 3500);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [uid]);

  const visibleBuddies = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = buddies.filter((b) => !hiddenBuddyIds.includes(b.uid));
    if (!term) return base;
    return base.filter((b) => b.name.toLowerCase().includes(term));
  }, [buddies, hiddenBuddyIds, search]);

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(term));
  }, [groups, search]);

  const removeBuddy = async (buddyId: string) => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from('buddies')
      .delete()
      .eq('owner_id', uid)
      .eq('buddy_id', buddyId);

    if (error) {
      const message = error.message ?? 'Unknown error';
      Alert.alert('Unable to remove buddy', message);
      return;
    }

    // Also mark any accepted friend_requests between these two users as declined
    // so that materializeAcceptedConnections does not recreate the buddy row.
    const now = new Date().toISOString();

    await supabase
      .from('friend_requests')
      .update({ status: 'declined', responded_at: now })
      .eq('requester_id', uid)
      .eq('target_id', buddyId)
      .eq('status', 'accepted');

    await supabase
      .from('friend_requests')
      .update({ status: 'declined', responded_at: now })
      .eq('requester_id', buddyId)
      .eq('target_id', uid)
      .eq('status', 'accepted');

    // Optimistically update the local list so the buddy disappears immediately
    setBuddies((prev) => prev.filter((b) => b.uid !== buddyId));
    setHiddenBuddyIds((prev) => (prev.includes(buddyId) ? prev : [...prev, buddyId]));
  };

  const createGroup = async () => {
    if (!supabase || !groupName.trim() || !groupCourse.trim()) {
      return;
    }

    const { error } = await supabase.from('study_groups').insert({
      owner_id: uid,
      name: groupName.trim(),
      course: groupCourse.trim(),
      member_ids: [uid],
      member_count: 1,
      next_session: 'TBD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Unable to create group', error.message);
      return;
    }

    setGroupName('');
    setGroupCourse('');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>My Buddies</Heading>
        <Subheading>Your study network and shared groups</Subheading>

        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segmentItem, tab === 'buddies' && styles.segmentItemActive]}
            onPress={() => setTab('buddies')}
          >
            <Text style={[styles.segmentLabel, tab === 'buddies' && styles.segmentLabelActive]}>Buddies</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentItem, tab === 'groups' && styles.segmentItemActive]}
            onPress={() => setTab('groups')}
          >
            <Text style={[styles.segmentLabel, tab === 'groups' && styles.segmentLabelActive]}>Study Groups</Text>
          </Pressable>
        </View>

        <AppInput
          placeholder={tab === 'buddies' ? 'Search buddies...' : 'Search groups...'}
          value={search}
          onChangeText={setSearch}
        />

        {tab === 'buddies'
          ? visibleBuddies.map((buddy) => (
              <Card key={buddy.uid} style={styles.cardGap}>
                <Text style={styles.name}>{buddy.name}</Text>
                <Text style={styles.meta}>{buddy.role}</Text>
                <Text style={styles.courses}>{buddy.courses.join(' • ') || 'No courses listed'}</Text>
                <View style={styles.buddyActionsRow}>
                  <View style={styles.buddyAction}>
                    <AppButton
                      text="Message"
                      variant="outline"
                      onPress={() =>
                        Alert.alert('Messages', 'Open the Messages tab to chat with this buddy.')
                      }
                    />
                  </View>
                  <View style={styles.buddyAction}>
                    <AppButton
                      text="Remove"
                      variant="outline"
                      onPress={() => void removeBuddy(buddy.uid)}
                    />
                  </View>
                </View>
              </Card>
            ))
          : null}
        {tab === 'buddies' && visibleBuddies.length === 0 ? (
          <Text style={styles.empty}>No buddies yet.</Text>
        ) : null}

        {tab === 'groups' ? <Text style={styles.sectionTitle}>Study Groups</Text> : null}

        {tab === 'groups' ? (
        <Card style={styles.cardGap}>
          <AppInput
            placeholder="Group name"
            value={groupName}
            onChangeText={setGroupName}
          />
          <AppInput
            placeholder="Course"
            value={groupCourse}
            onChangeText={setGroupCourse}
            style={styles.noMargin}
          />
          <View style={styles.createButtonWrap}>
            <AppButton text="Create Group" variant="gold" onPress={() => void createGroup()} />
          </View>
        </Card>
        ) : null}

        {tab === 'groups'
          ? visibleGroups.map((group) => (
              <Card key={group.id} style={styles.cardGap}>
                <Text style={styles.name}>{group.name}</Text>
                <Text style={styles.meta}>{group.course}</Text>
                <Text style={styles.courses}>
                  Members: {group.memberCount} • Next: {group.nextSession}
                </Text>
              </Card>
            ))
          : null}
        {tab === 'groups' && visibleGroups.length === 0 ? (
          <Text style={styles.empty}>No study groups yet.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    padding: 2,
    marginTop: 14,
    marginBottom: 10,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.white,
  },
  segmentLabel: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.textStrong,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 24,
    fontWeight: '800',
    color: colors.textStrong,
  },
  cardGap: {
    marginBottom: 10,
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.textStrong,
  },
  meta: {
    marginTop: 2,
    color: colors.textMuted,
  },
  courses: {
    marginTop: 8,
    marginBottom: 10,
    color: colors.textBody,
  },
  buddyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  buddyAction: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 10,
    marginBottom: 12,
  },
  noMargin: {
    marginBottom: 0,
  },
  createButtonWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
    minWidth: 140,
  },
});
