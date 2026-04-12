import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getUserProfile, supabase, type UserProfile } from '../lib/supabase';
import { AppButton, AppInput, Badge, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type CommunityComment = {
  id: string;
  author: string;
  content: string;
};

type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  avatarUrl: string;
  role: string;
  course: string;
  content: string;
  likedByMe: boolean;
  likeCount: number;
  comments: CommunityComment[];
};

type Props = { uid: string };

export function CommunityScreen({ uid }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [courseFilter, setCourseFilter] = useState('all');
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const myProfile = await getUserProfile(uid);
      if (active) {
        setProfile(myProfile);
      }

      const [postsResp, likesResp, commentsResp] = await Promise.all([
        supabase
          .from('community_posts')
          .select('id,author_id,author_name,author_role,course,content')
          .order('created_at', { ascending: false }),
        supabase.from('community_post_likes').select('post_id,user_id'),
        supabase.from('community_post_comments').select('id,post_id,author_name,content').order('created_at', { ascending: true }),
      ]);

      if (!active || postsResp.error || likesResp.error || commentsResp.error) {
        return;
      }

      const likesByPost = new Map<string, Set<string>>();
      (likesResp.data ?? []).forEach((row) => {
        const postId = String(row.post_id ?? '');
        const likerId = String(row.user_id ?? '');
        if (!postId || !likerId) {
          return;
        }
        if (!likesByPost.has(postId)) {
          likesByPost.set(postId, new Set());
        }
        likesByPost.get(postId)?.add(likerId);
      });

      const commentsByPost = new Map<string, CommunityComment[]>();
      (commentsResp.data ?? []).forEach((row) => {
        const postId = String(row.post_id ?? '');
        if (!postId) {
          return;
        }
        const list = commentsByPost.get(postId) ?? [];
        list.push({
          id: String(row.id ?? ''),
          author: String(row.author_name ?? 'User'),
          content: String(row.content ?? ''),
        });
        commentsByPost.set(postId, list);
      });

      const postRows = postsResp.data ?? [];

      const authorIds = Array.from(
        new Set(
          postRows
            .map((row) => String(row.author_id ?? ''))
            .filter((id) => id.length > 0),
        ),
      );

      const avatarById = new Map<string, string>();
      if (authorIds.length > 0) {
        const usersResp = await supabase
          .from('users')
          .select('uid,avatar_url')
          .in('uid', authorIds);

        if (!active || usersResp.error) {
          return;
        }

        for (const row of usersResp.data ?? []) {
          const id = String((row as { uid?: unknown }).uid ?? '');
          const url = String((row as { avatar_url?: unknown }).avatar_url ?? '');
          if (id && url) {
            avatarById.set(id, url);
          }
        }
      }

      const mapped: CommunityPost[] = postRows.map((row) => {
        const id = String(row.id ?? '');
        const authorId = String(row.author_id ?? '');
        const likes = likesByPost.get(id);

        return {
          id,
          authorId,
          author: String(row.author_name ?? 'User'),
          avatarUrl: avatarById.get(authorId) ?? '',
          role: String(row.author_role ?? 'member'),
          course: String(row.course ?? 'General'),
          content: String(row.content ?? ''),
          likedByMe: Boolean(likes?.has(uid)),
          likeCount: likes?.size ?? 0,
          comments: commentsByPost.get(id) ?? [],
        };
      });

      setPosts(mapped);
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

  const visiblePosts = useMemo(
    () => (courseFilter === 'all' ? posts : posts.filter((p) => p.course === courseFilter)),
    [posts, courseFilter],
  );

  const handlePost = async () => {
    if (!supabase || !newPost.trim()) {
      return;
    }

    await supabase.from('community_posts').insert({
      author_id: uid,
      author_name: profile?.name || 'User',
      author_role: profile?.userRole || 'member',
      course: courseFilter === 'all' ? profile?.selectedCourses[0] || 'General' : courseFilter,
      content: newPost.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setNewPost('');
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!supabase) {
      return;
    }

    if (post.likedByMe) {
      await supabase.from('community_post_likes').delete().eq('post_id', post.id).eq('user_id', uid);
    } else {
      await supabase.from('community_post_likes').insert({
        post_id: post.id,
        user_id: uid,
        created_at: new Date().toISOString(),
      });
    }
  };

  const addComment = async (post: CommunityPost) => {
    const content = commentDrafts[post.id]?.trim();
    if (!supabase || !content) {
      return;
    }

    await supabase.from('community_post_comments').insert({
      post_id: post.id,
      author_id: uid,
      author_name: profile?.name || 'User',
      content,
      created_at: new Date().toISOString(),
    });

    setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
    setOpenComments((prev) => ({ ...prev, [post.id]: true }));
  };

  const courseOptions = profile?.selectedCourses ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Community Wall</Heading>
        <Subheading>Share your thoughts with your courses</Subheading>

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

        <Card style={styles.cardGap}>
          <AppInput
            placeholder="Share your thoughts, ask questions..."
            value={newPost}
            onChangeText={setNewPost}
            multiline
            style={styles.textArea}
          />
          <View style={styles.postButtonWrap}>
            <AppButton text="Post" variant="gold" onPress={() => void handlePost()} />
          </View>
        </Card>

        {visiblePosts.map((post) => (
          <Card key={post.id} style={styles.cardGap}>
            <View style={styles.postHeaderRow}>
              <View style={styles.postAvatarCircle}>
                {post.avatarUrl ? (
                  <Image source={{ uri: post.avatarUrl }} style={styles.postAvatarImage} />
                ) : null}
              </View>
              <View style={styles.postHeaderText}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postMeta}>{post.course} • {post.role || 'member'}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>

            <View style={styles.row}>
              <Pressable onPress={() => void toggleLike(post)}>
                <Text style={styles.actionText}>{post.likedByMe ? '♥' : '♡'} {post.likeCount}</Text>
              </Pressable>
              <Pressable onPress={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}>
                <Text style={styles.actionText}>Comments ({post.comments.length})</Text>
              </Pressable>
            </View>

            {openComments[post.id] ? (
              <View style={styles.commentsWrap}>
                {post.comments.map((c) => (
                  <View key={c.id} style={styles.commentBox}>
                    <Text style={styles.commentAuthor}>{c.author}</Text>
                    <Text style={styles.commentBody}>{c.content}</Text>
                  </View>
                ))}
                <View style={styles.commentComposer}>
                  <AppInput
                    placeholder="Write comment"
                    value={commentDrafts[post.id] || ''}
                    onChangeText={(text) => setCommentDrafts((prev) => ({ ...prev, [post.id]: text }))}
                    style={styles.commentInput}
                  />
                  <View style={styles.sendWrap}>
                    <AppButton text="Send" onPress={() => void addComment(post)} />
                  </View>
                </View>
              </View>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  dropdownWrapper: {
    marginTop: 14,
    marginBottom: 10,
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
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  postButtonWrap: {
    marginTop: 2,
    alignSelf: 'flex-end',
    minWidth: 96,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  postAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenSoft,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  postAvatarImage: {
    width: '100%',
    height: '100%',
  },
  postHeaderText: {
    flex: 1,
  },
  postAuthor: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.textStrong,
  },
  postMeta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  postContent: {
    marginTop: 10,
    marginBottom: 10,
    color: colors.textBody,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    color: colors.green,
    fontWeight: '700',
  },
  commentsWrap: {
    marginTop: 10,
    gap: 8,
  },
  commentBox: {
    backgroundColor: colors.greenSoft,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentAuthor: {
    fontWeight: '700',
    marginBottom: 2,
    color: colors.textStrong,
  },
  commentBody: {
    color: colors.textBody,
  },
  commentComposer: {
    gap: 8,
  },
  commentInput: {
    flex: 1,
    marginBottom: 0,
  },
  sendWrap: {
    alignSelf: 'flex-end',
    minWidth: 96,
  },
});
