import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { AppButton, AppInput, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';
import { useToast } from '../ui/toast';

type Buddy = {
  uid: string;
  name: string;
  role: string;
  courses: string[];
  avatarUrl: string;
};

type StudyGroup = {
  id: string;
  name: string;
  course: string;
  memberCount: number;
  nextSession: string;
  isMember: boolean;
  isOwner: boolean;
  hasRequested: boolean;
  pendingRequesterIds: string[];
  lastRequestStatus: string;
};

type GroupChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
};

type Props = { uid: string };

export function BuddiesScreen({ uid }: Props) {
  const { showToast } = useToast();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [hiddenBuddyIds, setHiddenBuddyIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupCourse, setGroupCourse] = useState('');
  const [tab, setTab] = useState<'buddies' | 'groups'>('buddies');
  const [search, setSearch] = useState('');
  const [groupMode, setGroupMode] = useState<'list' | 'chat'>('list');
  const [activeGroupId, setActiveGroupId] = useState('');
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const [groupDraft, setGroupDraft] = useState('');
  const [removeOptions, setRemoveOptions] = useState<
    | {
        groupId: string;
        members: { id: string; name: string }[];
      }
    | null
  >(null);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [buddiesResp, groupsResp, myReqResp, pendingReqResp] = await Promise.all([
        supabase
          .from('buddies')
          .select('buddy_id,name,role,courses')
          .eq('owner_id', uid)
          .order('added_at', { ascending: false }),
        supabase
          .from('study_groups')
          .select('id,name,course,member_count,next_session,member_ids,owner_id')
          .order('updated_at', { ascending: false }),
        supabase
          .from('study_group_requests')
          .select('id,group_id,requester_id,status,created_at')
          .eq('requester_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('study_group_requests')
          .select('id,group_id,requester_id,status')
          .eq('status', 'pending'),
      ]);

      if (!active) {
        return;
      }

      if (buddiesResp.error || groupsResp.error || myReqResp.error || pendingReqResp.error) {
        return;
      }

      const fromTable: Buddy[] = (buddiesResp.data ?? []).map((row) => ({
        uid: String(row.buddy_id ?? ''),
        name: String(row.name ?? 'Buddy'),
        role: String(row.role ?? 'Member'),
        courses: Array.isArray(row.courses) ? row.courses.map((item: unknown) => String(item)) : [],
        avatarUrl: '',
      }));

      const buddyIds = fromTable.map((b) => b.uid).filter((id) => id.length > 0);
      let avatarByUid = new Map<string, string>();

      if (buddyIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('uid,avatar_url')
          .in('uid', buddyIds);

        avatarByUid = new Map(
          (usersData ?? []).map((row) => [
            String((row as { uid?: unknown }).uid ?? ''),
            String((row as { avatar_url?: unknown }).avatar_url ?? ''),
          ]),
        );
      }

      setBuddies(
        fromTable.map((buddy) => ({
          ...buddy,
          avatarUrl: avatarByUid.get(buddy.uid) ?? '',
        })),
      );

      const myRequests = (myReqResp.data ?? []) as Array<{
        group_id?: unknown;
        status?: unknown;
      }>;

      const pendingRequests = (pendingReqResp.data ?? []) as Array<{
        group_id?: unknown;
        requester_id?: unknown;
        status?: unknown;
      }>;

      setGroups(
        (groupsResp.data ?? []).map((row) => {
          const memberIds = Array.isArray(row.member_ids)
            ? row.member_ids.map((item: unknown) => String(item))
            : [];

          const memberCount =
            typeof row.member_count === 'number' && !Number.isNaN(row.member_count)
              ? Number(row.member_count)
              : memberIds.length || 1;

          const idStr = String(row.id ?? '');
          const isOwner = String(row.owner_id ?? '') === uid;

          const myReq = myRequests.find((req) => String(req.group_id ?? '') === idStr);
          const lastRequestStatus = myReq ? String(myReq.status ?? '') : '';
          const hasRequested = lastRequestStatus === 'pending';

          const pendingRequesterIds = pendingRequests
            .filter(
              (req) =>
                String(req.group_id ?? '') === idStr &&
                String(req.status ?? '') === 'pending',
            )
            .map((req) => String(req.requester_id ?? ''))
            .filter((id) => id.length > 0);

          return {
            id: idStr,
            name: String(row.name ?? 'Study Group'),
            course: String(row.course ?? 'General'),
            memberCount,
            nextSession: String(row.next_session ?? 'TBD'),
            isMember: memberIds.includes(uid),
            isOwner,
            hasRequested,
            pendingRequesterIds,
            lastRequestStatus,
          };
        }),
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

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId],
  );

  useEffect(() => {
    if (!activeGroupId || !supabase || groupMode !== 'chat' || tab !== 'groups') {
      setGroupMessages([]);
      return;
    }

    const client = supabase;
    let active = true;

    const fetch = async () => {
      const { data, error } = await client
        .from('study_group_messages')
        .select('id,sender_id,sender_name,text,created_at')
        .eq('group_id', activeGroupId)
        .order('created_at', { ascending: true });

      if (!active || error) {
        return;
      }

      setGroupMessages(
        (data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          senderId: String(row.sender_id ?? ''),
          senderName: String(row.sender_name ?? 'User'),
          text: String(row.text ?? ''),
          createdAt: String(row.created_at ?? ''),
        })),
      );
    };

    void fetch();
    const id = setInterval(() => {
      void fetch();
    }, 2000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [activeGroupId, groupMode, tab]);

  const joinGroup = async (groupId: string) => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.from('study_group_requests').insert({
      group_id: groupId,
      requester_id: uid,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) {
      const message = error.message ?? 'Unknown error';
      Alert.alert('Unable to request to join', message);
      return;
    }

    showToast('Request sent. The group owner will review it.', { variant: 'success' });

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              hasRequested: true,
            }
          : g,
      ),
    );
  };

  const acceptNextRequest = async (groupId: string) => {
    if (!supabase) {
      return;
    }

    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.isOwner || group.pendingRequesterIds.length === 0) {
      return;
    }

    const requesterId = group.pendingRequesterIds[0];

    const { data, error } = await supabase
      .from('study_groups')
      .select('member_ids,member_count')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      const message = error?.message ?? 'Unknown error';
      Alert.alert('Unable to accept request', message);
      return;
    }

    const currentIds = Array.isArray(data.member_ids)
      ? data.member_ids.map((item: unknown) => String(item))
      : [];

    const alreadyMember = currentIds.includes(requesterId);
    const updatedIds = alreadyMember ? currentIds : [...currentIds, requesterId];

    const { error: updateGroupError } = await supabase
      .from('study_groups')
      .update({
        member_ids: updatedIds,
        member_count: updatedIds.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId);

    if (updateGroupError) {
      const message = updateGroupError.message ?? 'Unknown error';
      Alert.alert('Unable to accept request', message);
      return;
    }

    const { error: updateReqError } = await supabase
      .from('study_group_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('group_id', groupId)
      .eq('requester_id', requesterId)
      .eq('status', 'pending');

    if (updateReqError) {
      const message = updateReqError.message ?? 'Unknown error';
      Alert.alert('Unable to update request', message);
      return;
    }

    showToast('Request accepted. Member added to your group.', { variant: 'success' });

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) {
          return g;
        }

        const remaining = g.pendingRequesterIds.filter((id) => id !== requesterId);

        return {
          ...g,
          memberCount: alreadyMember ? g.memberCount : g.memberCount + 1,
          pendingRequesterIds: remaining,
        };
      }),
    );
  };

  const declineNextRequest = async (groupId: string) => {
    if (!supabase) {
      return;
    }

    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.isOwner || group.pendingRequesterIds.length === 0) {
      return;
    }

    const requesterId = group.pendingRequesterIds[0];

    const { error: updateReqError } = await supabase
      .from('study_group_requests')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('group_id', groupId)
      .eq('requester_id', requesterId)
      .eq('status', 'pending');

    if (updateReqError) {
      const message = updateReqError.message ?? 'Unknown error';
      Alert.alert('Unable to decline request', message);
      return;
    }

    showToast('Request declined.', { variant: 'info' });

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) {
          return g;
        }

        const remaining = g.pendingRequesterIds.filter((id) => id !== requesterId);

        return {
          ...g,
          pendingRequesterIds: remaining,
        };
      }),
    );
  };

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

  const leaveGroup = async (groupId: string) => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from('study_groups')
      .select('member_ids,member_count,owner_id')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      const message = error?.message ?? 'Unknown error';
      Alert.alert('Unable to leave group', message);
      return;
    }

    const ownerId = String(data.owner_id ?? '');
    const memberIds = Array.isArray(data.member_ids)
      ? data.member_ids.map((item: unknown) => String(item))
      : [];

    if (ownerId === uid) {
      const remainingMemberIds = memberIds.filter((id) => id !== uid);

      if (remainingMemberIds.length === 0) {
        const { error: deleteError } = await supabase
          .from('study_groups')
          .delete()
          .eq('id', groupId);

        if (deleteError) {
          const message = deleteError.message ?? 'Unknown error';
          Alert.alert('Unable to delete group', message);
          return;
        }

        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        return;
      }

      const newOwnerId = remainingMemberIds[0];

      const { error: transferError } = await supabase
        .from('study_groups')
        .update({
          owner_id: newOwnerId,
          member_ids: remainingMemberIds,
          member_count: remainingMemberIds.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (transferError) {
        const message = transferError.message ?? 'Unknown error';
        Alert.alert('Unable to leave group', message);
        return;
      }

      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, isOwner: false, isMember: false, memberCount: remainingMemberIds.length } : g)));
      return;
    }

    const nextIds = memberIds.filter((id) => id !== uid);

    const { error: updateError } = await supabase
      .from('study_groups')
      .update({
        member_ids: nextIds,
        member_count: nextIds.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId);

    if (updateError) {
      const message = updateError.message ?? 'Unknown error';
      Alert.alert('Unable to leave group', message);
      return;
    }

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              isMember: false,
              memberCount: Math.max(0, g.memberCount - 1),
            }
          : g,
      ),
    );
  };

  const removeMember = async (groupId: string) => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from('study_groups')
      .select('member_ids,member_count,owner_id')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      const message = error?.message ?? 'Unknown error';
      Alert.alert('Unable to remove member', message);
      return;
    }

    const ownerId = String(data.owner_id ?? '');
    const memberIds = Array.isArray(data.member_ids)
      ? data.member_ids.map((item: unknown) => String(item))
      : [];

    const candidateIds = memberIds.filter((id) => id && id !== ownerId);
    if (candidateIds.length === 0) {
      Alert.alert('No members to remove', 'Only the owner is in this group.');
      return;
    }

    let members: { id: string; name: string }[] = candidateIds.map((id) => ({ id, name: 'Member' }));

    const { data: usersData } = await supabase
      .from('users')
      .select('uid,name')
      .in('uid', candidateIds);

    if (Array.isArray(usersData)) {
      const byId = new Map<string, string>();
      for (const row of usersData) {
        const id = String((row as { uid?: unknown }).uid ?? '');
        const name = String((row as { name?: unknown }).name ?? 'Student');
        if (id) {
          byId.set(id, name || 'Student');
        }
      }
      members = candidateIds.map((id) => ({ id, name: byId.get(id) ?? 'Student' }));
    }

    setRemoveOptions({ groupId, members });
  };

  const confirmRemoveMember = async (groupId: string, memberId: string) => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from('study_groups')
      .select('member_ids,member_count')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      const message = error?.message ?? 'Unknown error';
      Alert.alert('Unable to remove member', message);
      return;
    }

    const memberIds = Array.isArray(data.member_ids)
      ? data.member_ids.map((item: unknown) => String(item))
      : [];

    const nextIds = memberIds.filter((id) => id !== memberId);

    const { error: updateError } = await supabase
      .from('study_groups')
      .update({
        member_ids: nextIds,
        member_count: nextIds.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId);

    if (updateError) {
      const message = updateError.message ?? 'Unknown error';
      Alert.alert('Unable to remove member', message);
      return;
    }

    showToast('Member removed from the group.', { variant: 'success' });

    setRemoveOptions((prev) => {
      if (!prev || prev.groupId !== groupId) return prev;
      const remainingMembers = prev.members.filter((m) => m.id !== memberId);
      return remainingMembers.length > 0 ? { groupId, members: remainingMembers } : null;
    });

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              memberCount: Math.max(0, g.memberCount - 1),
            }
          : g,
      ),
    );
  };

  const sendGroupMessage = async () => {
    if (!supabase || !activeGroupId || !groupDraft.trim()) {
      return;
    }

    const text = groupDraft.trim();

    const { error } = await supabase.from('study_group_messages').insert({
      group_id: activeGroupId,
      sender_id: uid,
      sender_name: 'You',
      text,
      created_at: new Date().toISOString(),
    });

    if (error) {
      const message = error.message ?? 'Unknown error';
      Alert.alert('Unable to send message', message);
      return;
    }

    setGroupDraft('');
  };

  return (
    <Screen>
      {tab === 'groups' && groupMode === 'chat' ? (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <Pressable
              onPress={() => {
                setGroupMode('list');
                setActiveGroupId('');
              }}
              style={styles.backButton}
            >
              <Text style={styles.backGlyph}>{'<'}</Text>
            </Pressable>
            {activeGroup ? (
              <View style={styles.chatHeaderText}>
                <Text style={styles.chatTitle}>{activeGroup.name}</Text>
                <Text style={styles.chatSubtitle}>{activeGroup.course}</Text>
              </View>
            ) : null}
          </View>

          {!activeGroup ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Select a study group to chat.</Text>
            </View>
          ) : (
            <Card style={styles.chatCard}>
              <ScrollView style={styles.chatWrap} contentContainerStyle={styles.chatContent}>
                {groupMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[styles.msgBubble, msg.senderId === uid ? styles.mine : styles.theirs]}
                  >
                    <Text
                      style={[styles.msgText, msg.senderId === uid && styles.msgTextMine]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.composeRow}>
                <AppInput
                  value={groupDraft}
                  onChangeText={setGroupDraft}
                  placeholder="Type a message..."
                  style={styles.composeInput}
                />
                <View style={styles.sendWrap}>
                  <AppButton text="Send" onPress={() => void sendGroupMessage()} />
                </View>
              </View>
            </Card>
          )}
        </View>
      ) : (
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
                <View style={styles.buddyHeader}>
                  {buddy.avatarUrl ? (
                    <Image source={{ uri: buddy.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {buddy.name.trim().charAt(0).toUpperCase() || 'B'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.buddyIdentity}>
                    <Text style={styles.name}>{buddy.name}</Text>
                    <Text style={styles.meta}>{buddy.role}</Text>
                  </View>
                </View>
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
                      variant="reject"
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
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{group.course}</Text>
                  {group.isOwner ? <Text style={styles.ownerLabel}>Owner</Text> : null}
                </View>
                <Text style={styles.courses}>
                  Members: {group.memberCount} • Next: {group.nextSession}
                </Text>
                {group.isMember ? (
                  <>
                    <Text style={styles.groupStatus}>Joined</Text>
                    <View style={styles.joinButtonsRow}>
                      <View style={styles.joinButtonHalf}>
                        <AppButton
                          text="Open chat"
                          variant="outline"
                          onPress={() => {
                            setActiveGroupId(group.id);
                            setGroupMode('chat');
                          }}
                        />
                      </View>
                      <View style={styles.joinButtonHalf}>
                        <AppButton
                          text="Leave group"
                          variant="reject"
                          onPress={() => void leaveGroup(group.id)}
                        />
                      </View>
                    </View>
                  </>
                ) : group.lastRequestStatus === 'declined' ? (
                  <>
                    <Text style={styles.groupStatusDeclined}>Request declined</Text>
                    <View style={styles.joinButtonWrap}>
                      <AppButton
                        text="Request again"
                        variant="outline"
                        onPress={() => void joinGroup(group.id)}
                      />
                    </View>
                  </>
                ) : group.hasRequested ? (
                  <Text style={styles.groupStatus}>Request sent</Text>
                ) : (
                  <View style={styles.joinButtonWrap}>
                    <AppButton
                      text="Request to join"
                      variant="outline"
                      onPress={() => void joinGroup(group.id)}
                    />
                  </View>
                )}
                {group.isOwner && group.pendingRequesterIds.length > 0 ? (
                  <View style={styles.ownerRequests}>
                    <Text style={styles.ownerRequestsText}>
                      Pending requests: {group.pendingRequesterIds.length}
                    </Text>
                    <View style={styles.ownerRequestsButtons}>
                      <View style={styles.ownerRequestAction}>
                        <AppButton
                          text="Accept next"
                          onPress={() => void acceptNextRequest(group.id)}
                        />
                      </View>
                      <View style={styles.ownerRequestAction}>
                        <AppButton
                          text="Decline next"
                          variant="reject"
                          onPress={() => void declineNextRequest(group.id)}
                        />
                      </View>
                    </View>
                  </View>
                ) : null}

                {group.isOwner && group.memberCount > 1 ? (
                  <View style={styles.ownerRemoveWrap}>
                    <AppButton
                      text={
                        removeOptions && removeOptions.groupId === group.id
                          ? 'Choose member to remove'
                          : 'Remove a member'
                      }
                      variant="outline"
                      onPress={() => void removeMember(group.id)}
                    />

                    {removeOptions && removeOptions.groupId === group.id ? (
                      <View style={styles.ownerRemoveList}>
                        {removeOptions.members.map((m) => (
                          <View key={m.id} style={styles.ownerRemoveRow}>
                            <Text style={styles.ownerRemoveName}>{m.name}</Text>
                            <View style={styles.ownerRemoveAction}>
                              <AppButton
                                text="Remove"
                                variant="reject"
                                onPress={() => void confirmRemoveMember(group.id, m.id)}
                              />
                            </View>
                          </View>
                        ))}
                        <View style={styles.ownerRemoveCancelWrap}>
                          <AppButton
                            text="Cancel"
                            variant="outline"
                            onPress={() => setRemoveOptions(null)}
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            ))
          : null}
        {tab === 'groups' && visibleGroups.length === 0 ? (
          <Text style={styles.empty}>No study groups yet.</Text>
        ) : null}
        </ScrollView>
      )}
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  ownerLabel: {
    marginLeft: 8,
    color: colors.green,
    fontWeight: '600',
    fontSize: 12,
  },
  courses: {
    marginTop: 8,
    marginBottom: 10,
    color: colors.textBody,
  },
  buddyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buddyIdentity: {
    flex: 1,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.green,
  },
  avatarFallbackText: {
    color: colors.green,
    fontWeight: '800',
    fontSize: 18,
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
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  noMargin: {
    marginBottom: 0,
  },
  createButtonWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  groupStatus: {
    marginTop: 4,
    color: colors.green,
    fontWeight: '600',
  },
  groupStatusDeclined: {
    marginTop: 4,
    color: colors.textMuted,
    fontWeight: '600',
  },
  joinButtonWrap: {
    marginTop: 6,
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  joinButtonsRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  joinButtonHalf: {
    flex: 1,
    minWidth: 120,
  },
  ownerRequests: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ownerRequestsText: {
    color: colors.textMuted,
    marginBottom: 4,
  },
  ownerRequestsButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  ownerRequestAction: {
    flex: 1,
  },
  ownerRemoveWrap: {
    marginTop: 8,
    alignSelf: 'flex-start',
    minWidth: 160,
  },
  ownerRemoveList: {
    marginTop: 8,
    gap: 6,
  },
  ownerRemoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ownerRemoveName: {
    flex: 1,
    color: colors.textBody,
  },
  ownerRemoveAction: {
    minWidth: 110,
  },
  ownerRemoveCancelWrap: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  backGlyph: {
    fontSize: 22,
    color: colors.textStrong,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: colors.textStrong,
  },
  chatSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
  },
  chatCard: {
    flex: 1,
    marginTop: 4,
  },
  chatWrap: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 10,
  },
  msgBubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.green,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgText: {
    color: colors.textStrong,
  },
  msgTextMine: {
    color: colors.white,
  },
  composeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingBottom: 2,
    marginTop: 6,
  },
  composeInput: {
    flex: 1,
    marginBottom: 0,
  },
  sendWrap: {
    minWidth: 90,
  },
});
