import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { respondToFriendRequest } from '../lib/socialService';
import { AppButton, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type FriendRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

type PostNotification = {
  id: string;
  type: 'like' | 'comment';
  actorName: string;
  postCourse: string;
  postPreview: string;
  commentContent: string;
  createdAt: string;
};

type GroupRequest = {
  id: string;
  groupId: string;
  groupName: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

type GroupRequestUpdate = {
  id: string;
  groupId: string;
  groupName: string;
  status: 'accepted' | 'declined';
  createdAt: string;
};

type Props = { uid: string };

export function NotificationsScreen({ uid }: Props) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [postNotifications, setPostNotifications] = useState<PostNotification[]>([]);
  const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([]);
  const [groupRequestUpdates, setGroupRequestUpdates] = useState<GroupRequestUpdate[]>([]);
  const [notificationsLastSeenAt, setNotificationsLastSeenAt] = useState('');
  const hasMarkedSeenRef = useRef(false);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [incomingResp, ownPostsResp, incomingGroupReqResp, myGroupReqResp, meResp] = await Promise.all([
        supabase
          .from('friend_requests')
          .select('id,requester_id,requester_name,status,created_at')
          .eq('target_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('community_posts')
          .select('id,content,course')
          .eq('author_id', uid),
        supabase
          .from('study_group_requests')
          .select('id,group_id,requester_id,status,created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('study_group_requests')
          .select('id,group_id,status,created_at')
          .eq('requester_id', uid)
          .neq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('notifications_last_seen_at')
          .eq('uid', uid)
          .maybeSingle(),
      ]);

      if (
        !active ||
        incomingResp.error ||
        ownPostsResp.error ||
        incomingGroupReqResp.error ||
        myGroupReqResp.error ||
        meResp.error
      ) {
        return;
      }

      const lastSeenAt = String(
        (meResp.data as { notifications_last_seen_at?: unknown } | null)?.notifications_last_seen_at ??
          '',
      );
      setNotificationsLastSeenAt(lastSeenAt);

      setRequests(
        (incomingResp.data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          requesterId: String(row.requester_id ?? ''),
          requesterName: String(row.requester_name ?? 'User'),
          status: String(row.status ?? 'pending') as FriendRequest['status'],
          createdAt: String(row.created_at ?? ''),
        })),
      );

      const ownPosts = ownPostsResp.data ?? [];
      const postIds = ownPosts.map((row) => String(row.id ?? '')).filter(Boolean);
      const postById = new Map(
        ownPosts.map((row) => [String(row.id ?? ''), { content: String(row.content ?? ''), course: String(row.course ?? 'General') }]),
      );

      let notifications: PostNotification[] = [];

      if (postIds.length > 0) {
        const [likesResp, commentsResp] = await Promise.all([
          supabase
            .from('community_post_likes')
            .select('post_id,user_id,created_at')
            .in('post_id', postIds)
            .neq('user_id', uid)
            .order('created_at', { ascending: false }),
          supabase
            .from('community_post_comments')
            .select('id,post_id,author_id,author_name,content,created_at')
            .in('post_id', postIds)
            .neq('author_id', uid)
            .order('created_at', { ascending: false }),
        ]);

        if (!likesResp.error && !commentsResp.error) {
          const actorIds = Array.from(
            new Set([
              ...(likesResp.data ?? []).map((row) => String(row.user_id ?? '')).filter(Boolean),
              ...(commentsResp.data ?? []).map((row) => String(row.author_id ?? '')).filter(Boolean),
            ]),
          );

          const { data: actorRows } = actorIds.length
            ? await supabase.from('users').select('uid,name').in('uid', actorIds)
            : { data: [] as Array<{ uid?: unknown; name?: unknown }> };

          const actorNames = new Map(
            (actorRows ?? []).map((row) => [String(row.uid ?? ''), String(row.name ?? 'User')]),
          );

          const likes = (likesResp.data ?? []).map((row) => {
            const postId = String(row.post_id ?? '');
            const post = postById.get(postId);
            const actorId = String(row.user_id ?? '');
            return {
              id: `like-${postId}-${actorId}`,
              type: 'like' as const,
              actorName: actorNames.get(actorId) || 'User',
              postCourse: post?.course || 'General',
              postPreview: post?.content || '',
              commentContent: '',
              createdAt: String(row.created_at ?? ''),
            };
          });

          const comments = (commentsResp.data ?? []).map((row) => {
            const postId = String(row.post_id ?? '');
            const post = postById.get(postId);
            const actorId = String(row.author_id ?? '');
            return {
              id: `comment-${String(row.id ?? '')}`,
              type: 'comment' as const,
              actorName: actorNames.get(actorId) || String(row.author_name ?? 'User'),
              postCourse: post?.course || 'General',
              postPreview: post?.content || '',
              commentContent: String(row.content ?? ''),
              createdAt: String(row.created_at ?? ''),
            };
          });

          notifications = [...likes, ...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
      }

      setPostNotifications(notifications);

      const incomingGroups = (incomingGroupReqResp.data ?? []) as Array<{
        id?: unknown;
        group_id?: unknown;
        requester_id?: unknown;
        status?: unknown;
        created_at?: unknown;
      }>;

      const myGroupReqs = (myGroupReqResp.data ?? []) as Array<{
        id?: unknown;
        group_id?: unknown;
        status?: unknown;
        created_at?: unknown;
      }>;

      const groupIds = Array.from(
        new Set([
          ...incomingGroups.map((row) => String(row.group_id ?? '')).filter(Boolean),
          ...myGroupReqs.map((row) => String(row.group_id ?? '')).filter(Boolean),
        ]),
      );

      const requesterIds = Array.from(
        new Set(incomingGroups.map((row) => String(row.requester_id ?? '')).filter(Boolean)),
      );

      let groupNames = new Map<string, string>();
      let requesterNames = new Map<string, string>();

      if (groupIds.length > 0 || requesterIds.length > 0) {
        const [groupsResp, usersResp] = await Promise.all([
          groupIds.length
            ? supabase
                .from('study_groups')
                .select('id,name')
                .in('id', groupIds)
            : Promise.resolve({ data: [] as Array<{ id?: unknown; name?: unknown }> }),
          requesterIds.length
            ? supabase
                .from('users')
                .select('uid,name')
                .in('uid', requesterIds)
            : Promise.resolve({ data: [] as Array<{ uid?: unknown; name?: unknown }> }),
        ]);

        groupNames = new Map(
          ((groupsResp.data ?? []) as Array<{ id?: unknown; name?: unknown }>).map((row) => [
            String(row.id ?? ''),
            String(row.name ?? 'Study Group'),
          ]),
        );

        requesterNames = new Map(
          ((usersResp.data ?? []) as Array<{ uid?: unknown; name?: unknown }>).map((row) => [
            String(row.uid ?? ''),
            String(row.name ?? 'User'),
          ]),
        );
      }

      setGroupRequests(
        incomingGroups.map((row) => {
          const groupId = String(row.group_id ?? '');
          const requesterId = String(row.requester_id ?? '');
          return {
            id: String(row.id ?? ''),
            groupId,
            groupName: groupNames.get(groupId) || 'Study Group',
            requesterId,
            requesterName: requesterNames.get(requesterId) || 'User',
            status: String(row.status ?? 'pending') as GroupRequest['status'],
            createdAt: String(row.created_at ?? ''),
          };
        }),
      );

      setGroupRequestUpdates(
        myGroupReqs.map((row) => {
          const groupId = String(row.group_id ?? '');
          const statusStr = String(row.status ?? 'pending') as GroupRequestUpdate['status'] | 'pending';
          if (statusStr === 'pending') {
            return null;
          }
          return {
            id: String(row.id ?? ''),
            groupId,
            groupName: groupNames.get(groupId) || 'Study Group',
            status: statusStr as GroupRequestUpdate['status'],
            createdAt: String(row.created_at ?? ''),
          };
        }).filter((item): item is GroupRequestUpdate => Boolean(item)),
      );

      if (!hasMarkedSeenRef.current) {
        const nowIso = new Date().toISOString();
        hasMarkedSeenRef.current = true;
        setNotificationsLastSeenAt(nowIso);
        await supabase
          .from('users')
          .update({ notifications_last_seen_at: nowIso })
          .eq('uid', uid);
      }
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

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  const pendingGroupRequests = useMemo(
    () => groupRequests.filter((r) => r.status === 'pending'),
    [groupRequests],
  );

  const totalNew = useMemo(() => {
    const seenTs = Date.parse(notificationsLastSeenAt);
    const hasSeenTimestamp = Number.isFinite(seenTs);

    const isNew = (createdAt: string) => {
      if (!hasSeenTimestamp) {
        return true;
      }
      const createdTs = Date.parse(createdAt);
      return Number.isFinite(createdTs) && createdTs > seenTs;
    };

    const unseenFriendRequests = pending.filter((item) => isNew(item.createdAt)).length;
    const unseenGroupRequests = pendingGroupRequests.filter((item) => isNew(item.createdAt)).length;
    const unseenPostActivity = postNotifications.filter((item) => isNew(item.createdAt)).length;
    const unseenGroupUpdates = groupRequestUpdates.filter((item) => isNew(item.createdAt)).length;

    return unseenFriendRequests + unseenGroupRequests + unseenPostActivity + unseenGroupUpdates;
  }, [notificationsLastSeenAt, pending, pendingGroupRequests, postNotifications, groupRequestUpdates]);

  const handleDecision = async (request: FriendRequest, decision: 'accepted' | 'declined') => {
    await respondToFriendRequest(uid, request.id, decision);
  };

  const handleGroupDecision = async (
    request: GroupRequest,
    decision: 'accepted' | 'declined',
  ) => {
    if (!supabase) {
      return;
    }

    try {
      if (decision === 'accepted') {
        const { data, error } = await supabase
          .from('study_groups')
          .select('member_ids,member_count')
          .eq('id', request.groupId)
          .single();

        if (error || !data) {
          const message = error?.message ?? 'Unknown error';
          Alert.alert('Unable to accept request', message);
          return;
        }

        const currentIds = Array.isArray(data.member_ids)
          ? data.member_ids.map((item: unknown) => String(item))
          : [];

        const alreadyMember = currentIds.includes(request.requesterId);
        const updatedIds = alreadyMember ? currentIds : [...currentIds, request.requesterId];

        const { error: updateGroupError } = await supabase
          .from('study_groups')
          .update({
            member_ids: updatedIds,
            member_count: updatedIds.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.groupId);

        if (updateGroupError) {
          const message = updateGroupError.message ?? 'Unknown error';
          Alert.alert('Unable to accept request', message);
          return;
        }
      }

      const { error: updateReqError } = await supabase
        .from('study_group_requests')
        .update({
          status: decision,
          responded_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .eq('group_id', request.groupId)
        .eq('requester_id', request.requesterId)
        .eq('status', 'pending');

      if (updateReqError) {
        const message = updateReqError.message ?? 'Unknown error';
        Alert.alert('Unable to update request', message);
        return;
      }

      Alert.alert(
        decision === 'accepted' ? 'Request accepted' : 'Request declined',
        decision === 'accepted'
          ? 'The member has been added to your group.'
          : 'The join request has been declined.',
      );

      const now = new Date().toISOString();

      setGroupRequests((prev) => prev.filter((r) => r.id !== request.id));
      setGroupRequestUpdates((prev) => [
        {
          id: request.id,
          groupId: request.groupId,
          groupName: request.groupName,
          status: decision,
          createdAt: now,
        },
        ...prev,
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Unable to process request', message);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Heading>Notifications</Heading>
          {totalNew > 0 ? (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>{totalNew} new</Text>
            </View>
          ) : null}
        </View>
        <Subheading>Friend requests and activity on your posts</Subheading>

        <Card style={styles.cardGap}>
          <Text style={styles.section}>Friend Requests</Text>
          {pending.map((r) => (
            <View key={r.id} style={styles.rowCard}>
              <View style={styles.rowMain}>
                <Text style={styles.name}>{r.requesterName}</Text>
                <Text style={styles.meta}>sent you a request</Text>
              </View>
              <View style={styles.rowActions}>
                <AppButton text="Accept" onPress={() => void handleDecision(r, 'accepted')} />
                <AppButton text="Decline" variant="reject" onPress={() => void handleDecision(r, 'declined')} />
              </View>
            </View>
          ))}
          {pending.length === 0 ? <Text style={styles.empty}>No pending friend requests.</Text> : null}
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.section}>Study Group Requests</Text>
          {pendingGroupRequests.map((r) => (
            <View key={r.id} style={styles.rowCard}>
              <View style={styles.rowMain}>
                <Text style={styles.name}>{r.requesterName}</Text>
                <Text style={styles.meta}>
                  requested to join <Text style={styles.name}>{r.groupName}</Text>
                </Text>
              </View>
              <View style={styles.rowActions}>
                <AppButton
                  text="Accept"
                  onPress={() => void handleGroupDecision(r, 'accepted')}
                />
                <AppButton
                  text="Decline"
                  variant="reject"
                  onPress={() => void handleGroupDecision(r, 'declined')}
                />
              </View>
            </View>
          ))}
          {pendingGroupRequests.length === 0 ? (
            <Text style={styles.empty}>No pending study group requests.</Text>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.section}>Post Activity</Text>
          {postNotifications.map((n) => (
            <View key={n.id} style={styles.notice}>
              <Text style={styles.noticeTxt}>
                <Text style={styles.name}>{n.actorName}</Text> {n.type === 'like' ? 'liked' : 'commented on'} your post
              </Text>
              <Text style={styles.meta}>{n.postCourse}</Text>
              <Text style={styles.preview}>{n.postPreview}</Text>
              {n.commentContent ? <Text style={styles.comment}>"{n.commentContent}"</Text> : null}
            </View>
          ))}
          {postNotifications.length === 0 ? <Text style={styles.empty}>No likes or comments yet.</Text> : null}
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.section}>Study Group Updates</Text>
          {groupRequestUpdates.map((u) => (
            <View key={u.id} style={styles.notice}>
              <Text style={styles.noticeTxt}>
                Your request to join <Text style={styles.name}>{u.groupName}</Text> was{' '}
                {u.status === 'accepted' ? 'accepted' : 'declined'}.
              </Text>
            </View>
          ))}
          {groupRequestUpdates.length === 0 ? (
            <Text style={styles.empty}>No recent updates to group requests.</Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardGap: {
    marginTop: 14,
    marginBottom: 10,
  },
  section: {
    fontWeight: '800',
    fontSize: 17,
    color: colors.textStrong,
    marginBottom: 10,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  rowMain: {
    flexDirection: 'column',
  },
  name: {
    fontWeight: '700',
    color: colors.textStrong,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
  },
  empty: {
    color: colors.textMuted,
  },
  newPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.green,
  },
  newPillText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  notice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  noticeTxt: {
    color: colors.textStrong,
  },
  preview: {
    marginTop: 6,
    color: colors.textBody,
  },
  comment: {
    marginTop: 4,
    color: colors.textStrong,
  },
});
