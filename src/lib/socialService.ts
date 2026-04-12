import { getUserProfile } from './supabase';
import { supabase } from './supabase';

export type FriendRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  status: 'pending' | 'accepted' | 'declined';
};

export type Buddy = {
  uid: string;
  name: string;
  role: string;
  courses: string[];
};

export async function getBuddies(ownerId: string): Promise<Buddy[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('buddies')
    .select('buddy_id,name,role,courses')
    .eq('owner_id', ownerId)
    .order('added_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    uid: String(row.buddy_id ?? ''),
    name: String(row.name ?? 'Buddy'),
    role: String(row.role ?? 'Member'),
    courses: Array.isArray(row.courses) ? row.courses.map((item: unknown) => String(item)) : [],
  }));
}

export async function sendFriendRequest(currentUid: string, targetUserId: string, targetName = 'User'): Promise<void> {
  if (!supabase) {
    return;
  }

  const me = await getUserProfile(currentUid);
  const { error } = await supabase.from('friend_requests').upsert(
    {
      requester_id: currentUid,
      requester_name: me?.name || 'User',
      target_id: targetUserId,
      target_name: targetName,
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

export async function respondToFriendRequest(currentUid: string, requestId: string, decision: 'accepted' | 'declined'): Promise<void> {
  if (!supabase) {
    return;
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('target_id', currentUid)
    .select('requester_id,requester_name')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (decision === 'accepted' && data) {
    const requesterId = String(data.requester_id ?? '');
    const requesterName = String(data.requester_name ?? 'User');
    const requesterProfile = await getUserProfile(requesterId).catch(() => null);

    const buddyName = requesterProfile?.name || requesterName;
    const buddyRole = requesterProfile?.userRole || 'Member';
    const buddyCourses = requesterProfile?.selectedCourses ?? [];

    await supabase.from('buddies').upsert(
      {
        owner_id: currentUid,
        buddy_id: requesterId,
        name: buddyName,
        role: buddyRole,
        courses: buddyCourses,
        added_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,buddy_id' },
    );
  }
}

export async function getIncomingFriendRequests(uid: string): Promise<FriendRequest[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id,requester_id,requester_name,target_id,target_name,status')
    .eq('target_id', uid)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id ?? ''),
    requesterId: String(row.requester_id ?? ''),
    requesterName: String(row.requester_name ?? 'User'),
    targetId: String(row.target_id ?? ''),
    targetName: String(row.target_name ?? ''),
    status: String(row.status ?? 'pending') as FriendRequest['status'],
  }));
}

export async function materializeAcceptedConnections(currentUid: string): Promise<void> {
  if (!supabase || !currentUid) {
    return;
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('requester_id,target_id,target_name,status')
    .eq('requester_id', currentUid)
    .eq('status', 'accepted');

  if (error) {
    // Surface the error so callers can decide how to handle it
    throw error;
  }

  for (const row of data ?? []) {
    const targetId = String((row as { target_id?: unknown }).target_id ?? '');
    if (!targetId || targetId === currentUid) {
      continue;
    }

    const targetProfile = await getUserProfile(targetId).catch(() => null);
    const targetNameFromRow = String((row as { target_name?: unknown }).target_name ?? 'User');

    const buddyName = targetProfile?.name || targetNameFromRow;
    const buddyRole = targetProfile?.userRole || 'Member';
    const buddyCourses = targetProfile?.selectedCourses ?? [];

    const { error: buddyError } = await supabase.from('buddies').upsert(
      {
        owner_id: currentUid,
        buddy_id: targetId,
        name: buddyName,
        role: buddyRole,
        courses: buddyCourses,
        added_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,buddy_id' },
    );

    if (buddyError) {
      throw buddyError;
    }
  }
}

export function subscribeBuddies(uid: string, onUpdate: (items: Buddy[]) => void): () => void {
  let cancelled = false;

  const run = async () => {
    const items = await getBuddies(uid);
    if (!cancelled) {
      onUpdate(items);
    }
  };

  void run();
  const id = setInterval(() => {
    void run();
  }, 3000);

  return () => {
    cancelled = true;
    clearInterval(id);
  };
}
