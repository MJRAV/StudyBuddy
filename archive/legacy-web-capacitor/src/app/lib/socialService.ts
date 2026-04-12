import { supabase } from '@/app/lib/firebase';

type Unsubscribe = () => void;

export type MentorProfile = {
  uid: string;
  name: string;
  bio: string;
  courses: string[];
  major: string;
  avatarUrl: string;
};

export type Buddy = {
  uid: string;
  name: string;
  role: string;
  courses: string[];
  avatarUrl: string;
};

export type StudyGroup = {
  id: string;
  name: string;
  course: string;
  memberCount: number;
  nextSession: string;
};

export type FriendRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatarUrl: string;
  targetId: string;
  targetName: string;
  targetAvatarUrl: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

export type PostInteractionNotification = {
  id: string;
  type: 'like' | 'comment';
  postId: string;
  postPreview: string;
  postCourse: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string;
  commentContent: string;
  createdAt: string;
};

type UserRow = {
  uid: string;
  userRole?: unknown;
  courseRoles?: unknown;
  name?: unknown;
  bio?: unknown;
  selectedCourses?: unknown;
  major?: unknown;
  avatarUrl?: unknown;
};

type UserSummary = {
  uid: string;
  name: string;
  role: string;
  courses: string[];
  avatarUrl: string;
};

function getPostNotificationSeenKey(uid: string): string {
  return `postNotificationsLastSeenAt:${uid}`;
}

export function markPostNotificationsSeen(uid: string): void {
  if (typeof window === 'undefined' || !uid) {
    return;
  }
  window.localStorage.setItem(getPostNotificationSeenKey(uid), new Date().toISOString());
}

function getPostNotificationsSeenAt(uid: string): string {
  if (typeof window === 'undefined' || !uid) {
    return '';
  }
  return window.localStorage.getItem(getPostNotificationSeenKey(uid)) || '';
}

async function fetchPostInteractionNotifications(
  currentUserId: string,
): Promise<PostInteractionNotification[]> {
  if (!supabase || !currentUserId) {
    return [];
  }

  const client = supabase;
  const { data: ownPosts, error: ownPostsError } = await client
    .from('community_posts')
    .select('id,content,course')
    .eq('author_id', currentUserId);

  if (ownPostsError) {
    throw toReadableError(ownPostsError, 'Unable to load your posts for notifications.');
  }

  const postIds = (ownPosts ?? []).map((item) => String(item.id ?? '')).filter(Boolean);
  if (postIds.length === 0) {
    return [];
  }

  const postById = new Map(
    (ownPosts ?? []).map((item) => [
      String(item.id ?? ''),
      {
        content: String(item.content ?? ''),
        course: String(item.course ?? 'General'),
      },
    ]),
  );

  const [likesResp, commentsResp] = await Promise.all([
    client
      .from('community_post_likes')
      .select('post_id,user_id,created_at')
      .in('post_id', postIds)
      .neq('user_id', currentUserId)
      .order('created_at', { ascending: false }),
    client
      .from('community_post_comments')
      .select('id,post_id,author_id,author_name,content,created_at')
      .in('post_id', postIds)
      .neq('author_id', currentUserId)
      .order('created_at', { ascending: false }),
  ]);

  if (likesResp.error) {
    throw toReadableError(likesResp.error, 'Unable to load like notifications.');
  }

  if (commentsResp.error) {
    throw toReadableError(commentsResp.error, 'Unable to load comment notifications.');
  }

  const actorIds = Array.from(
    new Set([
      ...(likesResp.data ?? []).map((item) => String(item.user_id ?? '')).filter(Boolean),
      ...(commentsResp.data ?? []).map((item) => String(item.author_id ?? '')).filter(Boolean),
    ]),
  );

  const { data: actorRows } = actorIds.length
    ? await client.from('users').select('uid,name,avatar_url').in('uid', actorIds)
    : { data: [] as Array<{ uid?: unknown; name?: unknown; avatar_url?: unknown }> };

  const actorById = new Map(
    (actorRows ?? []).map((item) => [
      String(item.uid ?? ''),
      {
        name: String(item.name ?? 'User'),
        avatarUrl: String(item.avatar_url ?? ''),
      },
    ]),
  );

  const likeNotifications: PostInteractionNotification[] = (likesResp.data ?? []).map((row) => {
    const postId = String(row.post_id ?? '');
    const actorId = String(row.user_id ?? '');
    const post = postById.get(postId) ?? { content: '', course: 'General' };
    const actor = actorById.get(actorId) ?? { name: 'User', avatarUrl: '' };

    return {
      id: `like-${postId}-${actorId}`,
      type: 'like',
      postId,
      postPreview: post.content,
      postCourse: post.course,
      actorId,
      actorName: actor.name,
      actorAvatarUrl: actor.avatarUrl,
      commentContent: '',
      createdAt: String(row.created_at ?? ''),
    };
  });

  const commentNotifications: PostInteractionNotification[] = (commentsResp.data ?? []).map((row) => {
    const postId = String(row.post_id ?? '');
    const actorId = String(row.author_id ?? '');
    const post = postById.get(postId) ?? { content: '', course: 'General' };
    const actor = actorById.get(actorId) ?? {
      name: String(row.author_name ?? 'User'),
      avatarUrl: '',
    };

    return {
      id: `comment-${String(row.id ?? '')}`,
      type: 'comment',
      postId,
      postPreview: post.content,
      postCourse: post.course,
      actorId,
      actorName: actor.name,
      actorAvatarUrl: actor.avatarUrl,
      commentContent: String(row.content ?? ''),
      createdAt: String(row.created_at ?? ''),
    };
  });

  return [...likeNotifications, ...commentNotifications].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function subscribePostInteractionNotifications(
  currentUserId: string,
  onData: (items: PostInteractionNotification[]) => void,
): Unsubscribe | null {
  if (!supabase || !currentUserId) {
    return null;
  }

  let active = true;

  const fetch = async () => {
    try {
      const items = await fetchPostInteractionNotifications(currentUserId);
      if (!active) {
        return;
      }
      onData(items);
    } catch {
      if (active) {
        onData([]);
      }
    }
  };

  void fetch();
  const interval = window.setInterval(() => {
    void fetch();
  }, 4000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}

export function subscribeUnreadPostNotificationsCount(
  currentUserId: string,
  onCount: (count: number) => void,
): Unsubscribe | null {
  return subscribePostInteractionNotifications(currentUserId, (items) => {
    const seenAt = getPostNotificationsSeenAt(currentUserId);
    const unread = seenAt
      ? items.filter((item) => item.createdAt > seenAt).length
      : items.length;
    onCount(unread);
  });
}

function toReadableError(error: unknown, fallbackMessage: string): Error {
  if (!error) {
    return new Error(fallbackMessage);
  }

  if (error instanceof Error) {
    return error;
  }

  const row = error as Record<string, unknown>;
  const message =
    (typeof row.message === 'string' && row.message) ||
    (typeof row.error_description === 'string' && row.error_description) ||
    (typeof row.details === 'string' && row.details) ||
    fallbackMessage;

  return new Error(message);
}

async function getUserSummary(uid: string): Promise<UserSummary | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('uid,name,user_role,selected_courses,avatar_url')
    .eq('uid', uid)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    uid: String(data.uid ?? uid),
    name: String(data.name ?? 'User'),
    role: String(data.user_role ?? 'Member'),
    courses: Array.isArray(data.selected_courses)
      ? data.selected_courses.map((item: unknown) => String(item))
      : [],
    avatarUrl: String(data.avatar_url ?? ''),
  };
}

async function ensureConversationForBuddy(
  ownerId: string,
  buddyId: string,
  buddyName: string,
  buddyRole: string,
): Promise<void> {
  if (!supabase) {
    return;
  }

  const client = supabase;
  const { data, error } = await client
    .from('conversations')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('name', buddyName)
    .maybeSingle();

  if (error) {
    throw toReadableError(error, 'Unable to verify existing conversation.');
  }

  if (data?.id) {
    return;
  }

  const { error: insertError } = await client.from('conversations').insert({
    owner_id: ownerId,
    name: buddyName,
    role: buddyRole,
    last_message: '',
    unread: 0,
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    throw toReadableError(insertError, 'Unable to create conversation for new buddy.');
  }
}

export function subscribeMentors(
  currentUserId: string,
  onData: (mentors: MentorProfile[]) => void,
): Unsubscribe | null {
  if (!supabase) {
    return null;
  }
  const client = supabase;

  let active = true;

  const fetch = async () => {
    const { data, error } = await client
      .from('users')
      .select('uid,user_role,course_roles,name,bio,selected_courses,major,avatar_url');

    if (!active || error) {
      return;
    }

    const rows: UserRow[] = (data ?? []).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        uid: String(row.uid ?? ''),
        userRole: row.user_role,
        courseRoles: row.course_roles,
        name: row.name,
        bio: row.bio,
        selectedCourses: row.selected_courses,
        major: row.major,
        avatarUrl: row.avatar_url,
      };
    });

    const mentors = rows
      .filter((row) => row.uid !== currentUserId)
      .filter((row) => {
        const userRole = String(row.userRole ?? '');
        const courseRoles = (row.courseRoles ?? {}) as Record<string, string>;
        if (userRole === 'mentor') {
          return true;
        }

        return Object.values(courseRoles).includes('mentor');
      })
      .map((row) => ({
        uid: String(row.uid),
        name: String(row.name ?? 'User'),
        bio: String(row.bio ?? ''),
        courses: Array.isArray(row.selectedCourses)
          ? row.selectedCourses.map((c: unknown) => String(c))
          : [],
        major: String(row.major ?? ''),
        avatarUrl: String(row.avatarUrl ?? ''),
      }));

    onData(mentors);
  };

  void fetch();
  const interval = window.setInterval(() => {
    void fetch();
  }, 4000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}

export async function addBuddy(currentUserId: string, mentor: MentorProfile): Promise<void> {
  if (!supabase) {
    return;
  }
  const client = supabase;

  const { error } = await client.from('buddies').upsert(
    {
      owner_id: currentUserId,
      buddy_id: mentor.uid,
      name: mentor.name,
      role: 'Mentor',
      courses: mentor.courses,
      added_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id,buddy_id' },
  );

  if (error) {
    throw toReadableError(error, 'Unable to send friend request.');
  }
}

export async function sendFriendRequest(
  currentUserId: string,
  payload: { targetUserId: string; requesterName: string; targetName: string },
): Promise<void> {
  if (!supabase || currentUserId === payload.targetUserId) {
    return;
  }
  const client = supabase;

  const { error } = await client.from('friend_requests').upsert(
    {
      requester_id: currentUserId,
      requester_name: payload.requesterName,
      target_id: payload.targetUserId,
      target_name: payload.targetName,
      status: 'pending',
      created_at: new Date().toISOString(),
      responded_at: null,
    },
    { onConflict: 'requester_id,target_id' },
  );

  if (error) {
    throw error;
  }
}

export function subscribeIncomingFriendRequests(
  currentUserId: string,
  onData: (requests: FriendRequest[]) => void,
): Unsubscribe | null {
  if (!supabase) {
    return null;
  }
  const client = supabase;

  let active = true;

  const fetch = async () => {
    const { data, error } = await client
      .from('friend_requests')
      .select('id,requester_id,requester_name,target_id,target_name,status,created_at')
      .eq('target_id', currentUserId)
      .order('created_at', { ascending: false });

    if (!active || error) {
      return;
    }

    onData(
      (data ?? []).map((item) => ({
        id: String(item.id),
        requesterId: String(item.requester_id),
        requesterName: String(item.requester_name ?? 'User'),
        requesterAvatarUrl: '',
        targetId: String(item.target_id),
        targetName: String(item.target_name ?? 'User'),
        targetAvatarUrl: '',
        status: String(item.status ?? 'pending') as FriendRequest['status'],
        createdAt: String(item.created_at ?? ''),
      })),
    );
  };

  void fetch();
  const interval = window.setInterval(() => {
    void fetch();
  }, 3000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}

export function subscribeOutgoingFriendRequests(
  currentUserId: string,
  onData: (requests: FriendRequest[]) => void,
): Unsubscribe | null {
  if (!supabase) {
    return null;
  }
  const client = supabase;

  let active = true;

  const fetch = async () => {
    const { data, error } = await client
      .from('friend_requests')
      .select('id,requester_id,requester_name,target_id,target_name,status,created_at')
      .eq('requester_id', currentUserId)
      .order('created_at', { ascending: false });

    if (!active || error) {
      return;
    }

    onData(
      (data ?? []).map((item) => ({
        id: String(item.id),
        requesterId: String(item.requester_id),
        requesterName: String(item.requester_name ?? 'User'),
        requesterAvatarUrl: '',
        targetId: String(item.target_id),
        targetName: String(item.target_name ?? 'User'),
        targetAvatarUrl: '',
        status: String(item.status ?? 'pending') as FriendRequest['status'],
        createdAt: String(item.created_at ?? ''),
      })),
    );
  };

  void fetch();
  const interval = window.setInterval(() => {
    void fetch();
  }, 3000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}

export async function respondToFriendRequest(
  currentUserId: string,
  request: FriendRequest,
  decision: 'accepted' | 'declined',
): Promise<void> {
  if (!supabase) {
    return;
  }
  const client = supabase;

  const { error: updateError } = await client
    .from('friend_requests')
    .update({
      status: decision,
      responded_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .eq('target_id', currentUserId);

  if (updateError) {
    throw toReadableError(updateError, 'Unable to update friend request status.');
  }

  if (decision !== 'accepted') {
    return;
  }

  const currentUser = await getUserSummary(currentUserId);
  const requesterUser = await getUserSummary(request.requesterId);

  const receiverName = currentUser?.name ?? request.targetName;
  const receiverRole = currentUser?.role ?? 'Member';
  const receiverCourses = currentUser?.courses ?? [];

  const requesterName = requesterUser?.name ?? request.requesterName;
  const requesterRole = requesterUser?.role ?? 'Member';
  const requesterCourses = requesterUser?.courses ?? [];

  const now = new Date().toISOString();

  // With RLS, this client can only create rows owned by the current user.
  const { error: buddyError } = await client.from('buddies').upsert(
    {
      owner_id: currentUserId,
      buddy_id: request.requesterId,
      name: requesterName,
      role: requesterRole,
      courses: requesterCourses,
      added_at: now,
    },
    { onConflict: 'owner_id,buddy_id' },
  );

  if (buddyError) {
    throw toReadableError(buddyError, 'Request updated, but failed to add buddy relationship.');
  }

  await ensureConversationForBuddy(
    currentUserId,
    request.requesterId,
    requesterName,
    requesterRole,
  );
}

export async function materializeAcceptedConnections(currentUserId: string): Promise<void> {
  if (!supabase) {
    return;
  }

  const client = supabase;
  const { data, error } = await client
    .from('friend_requests')
    .select('id,requester_id,requester_name,target_id,target_name,status')
    .eq('requester_id', currentUserId)
    .eq('status', 'accepted');

  if (error) {
    throw toReadableError(error, 'Unable to sync accepted connections.');
  }

  for (const row of data ?? []) {
    const targetId = String(row.target_id ?? '');
    if (!targetId || targetId === currentUserId) {
      continue;
    }

    const targetUser = await getUserSummary(targetId);
    const targetName = targetUser?.name ?? String(row.target_name ?? 'User');
    const targetRole = targetUser?.role ?? 'Member';
    const targetCourses = targetUser?.courses ?? [];

    const { error: buddyError } = await client.from('buddies').upsert(
      {
        owner_id: currentUserId,
        buddy_id: targetId,
        name: targetName,
        role: targetRole,
        courses: targetCourses,
        added_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,buddy_id' },
    );

    if (buddyError) {
      throw toReadableError(buddyError, 'Unable to sync buddy record.');
    }

    await ensureConversationForBuddy(currentUserId, targetId, targetName, targetRole);
  }
}

export function subscribeBuddies(
  currentUserId: string,
  onData: (buddies: Buddy[]) => void,
): Unsubscribe | null {
  if (!supabase) {
    return null;
  }
  const client = supabase;

  let active = true;

  const fetch = async () => {
    const { data, error } = await client
      .from('buddies')
      .select('buddy_id,name,role,courses')
      .eq('owner_id', currentUserId)
      .order('added_at', { ascending: false });

    if (!active || error) {
      return;
    }

    const buddyIds = (data ?? []).map((item) => String(item.buddy_id)).filter(Boolean);
    const { data: avatarRows } = buddyIds.length
      ? await client.from('users').select('uid,avatar_url').in('uid', buddyIds)
      : { data: [] as Array<{ uid?: unknown; avatar_url?: unknown }> };

    const avatarByUid = new Map(
      (avatarRows ?? []).map((item) => [String(item.uid ?? ''), String(item.avatar_url ?? '')]),
    );

    onData(
      (data ?? []).map((item) => ({
        uid: String(item.buddy_id),
        name: String(item.name ?? 'User'),
        role: String(item.role ?? 'Member'),
        courses: Array.isArray(item.courses) ? item.courses.map((c: unknown) => String(c)) : [],
        avatarUrl: avatarByUid.get(String(item.buddy_id)) ?? '',
      })),
    );
  };

  void fetch();
  const interval = window.setInterval(() => {
    void fetch();
  }, 4000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}

export async function removeBuddy(currentUserId: string, buddyId: string): Promise<void> {
  if (!supabase) {
    return;
  }
  const client = supabase;

  const { error } = await client
    .from('buddies')
    .delete()
    .eq('owner_id', currentUserId)
    .eq('buddy_id', buddyId);

  if (error) {
    throw error;
  }
}

export function subscribeStudyGroups(
  currentUserId: string,
  onData: (groups: StudyGroup[]) => void,
): Unsubscribe | null {
  if (!supabase) {
    return null;
  }
  const client = supabase;

  let active = true;

  const fetch = async () => {
    const { data, error } = await client
      .from('study_groups')
      .select('id,name,course,member_count,next_session,member_ids')
      .contains('member_ids', [currentUserId])
      .order('updated_at', { ascending: false });

    if (!active || error) {
      return;
    }

    onData(
      (data ?? []).map((item) => ({
        id: String(item.id),
        name: String(item.name ?? 'Study Group'),
        course: String(item.course ?? 'General'),
        memberCount: Number(item.member_count ?? 1),
        nextSession: String(item.next_session ?? 'TBD'),
      })),
    );
  };

  void fetch();
  const interval = window.setInterval(() => {
    void fetch();
  }, 4000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}

export async function createStudyGroup(
  currentUserId: string,
  payload: { name: string; course: string },
): Promise<void> {
  if (!supabase) {
    return;
  }
  const client = supabase;

  const { error } = await client.from('study_groups').insert({
    name: payload.name,
    course: payload.course,
    owner_id: currentUserId,
    member_ids: [currentUserId],
    member_count: 1,
    next_session: 'TBD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}
