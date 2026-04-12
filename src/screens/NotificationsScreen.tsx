import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { respondToFriendRequest } from '../lib/socialService';
import { AppButton, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type FriendRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'accepted' | 'declined';
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

type Props = { uid: string };

export function NotificationsScreen({ uid }: Props) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [postNotifications, setPostNotifications] = useState<PostNotification[]>([]);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [incomingResp, ownPostsResp] = await Promise.all([
        supabase
          .from('friend_requests')
          .select('id,requester_id,requester_name,status')
          .eq('target_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('community_posts')
          .select('id,content,course')
          .eq('author_id', uid),
      ]);

      if (!active || incomingResp.error || ownPostsResp.error) {
        return;
      }

      setRequests(
        (incomingResp.data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          requesterId: String(row.requester_id ?? ''),
          requesterName: String(row.requester_name ?? 'User'),
          status: String(row.status ?? 'pending') as FriendRequest['status'],
        })),
      );

      const ownPosts = ownPostsResp.data ?? [];
      const postIds = ownPosts.map((row) => String(row.id ?? '')).filter(Boolean);
      const postById = new Map(
        ownPosts.map((row) => [String(row.id ?? ''), { content: String(row.content ?? ''), course: String(row.course ?? 'General') }]),
      );

      if (postIds.length === 0) {
        setPostNotifications([]);
        return;
      }

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

      if (likesResp.error || commentsResp.error) {
        return;
      }

      const actorIds = Array.from(
        new Set([
          ...(likesResp.data ?? []).map((row) => String(row.user_id ?? '')).filter(Boolean),
          ...(commentsResp.data ?? []).map((row) => String(row.author_id ?? '')).filter(Boolean),
        ]),
      );

      const { data: actorRows } = actorIds.length
        ? await supabase.from('users').select('uid,name').in('uid', actorIds)
        : { data: [] as Array<{ uid?: unknown; name?: unknown }> };

      const actorNames = new Map((actorRows ?? []).map((row) => [String(row.uid ?? ''), String(row.name ?? 'User')]));

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

      setPostNotifications([...likes, ...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
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

  const handleDecision = async (request: FriendRequest, decision: 'accepted' | 'declined') => {
    await respondToFriendRequest(uid, request.id, decision);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Heading>Notifications</Heading>
          {postNotifications.length + pending.length > 0 ? (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>{postNotifications.length + pending.length} new</Text>
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
                <AppButton text="Decline" variant="outline" onPress={() => void handleDecision(r, 'declined')} />
              </View>
            </View>
          ))}
          {pending.length === 0 ? <Text style={styles.empty}>No pending friend requests.</Text> : null}
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
