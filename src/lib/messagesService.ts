import { supabase } from './supabase';

export type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

export async function getConversations(uid: string): Promise<Conversation[]> {
  if (!supabase) {
    return [];
  }

  const [buddiesResp, dmResp] = await Promise.all([
    supabase.from('buddies').select('buddy_id,name').eq('owner_id', uid),
    supabase
      .from('direct_messages')
      .select('id,sender_id,recipient_id,text,is_read,created_at')
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order('created_at', { ascending: false }),
  ]);

  if (buddiesResp.error) {
    throw buddiesResp.error;
  }
  if (dmResp.error) {
    throw dmResp.error;
  }

  const dmRows = dmResp.data ?? [];

  return (buddiesResp.data ?? []).map((item) => {
    const buddyId = String(item.buddy_id ?? '');
    const thread = dmRows.filter((row) => {
      const sender = String(row.sender_id ?? '');
      const recipient = String(row.recipient_id ?? '');
      return (sender === uid && recipient === buddyId) || (sender === buddyId && recipient === uid);
    });

    return {
      id: buddyId,
      name: String(item.name ?? 'Buddy'),
      lastMessage: thread[0] ? String(thread[0].text ?? '') : '',
      unread: thread.filter((row) => String(row.recipient_id ?? '') === uid && !Boolean(row.is_read)).length,
    };
  });
}

export async function getMessages(uid: string, buddyId: string): Promise<ChatMessage[]> {
  if (!supabase || !buddyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .select('id,sender_id,sender_name,text,created_at')
    .or(`and(sender_id.eq.${uid},recipient_id.eq.${buddyId}),and(sender_id.eq.${buddyId},recipient_id.eq.${uid})`)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id ?? ''),
    senderId: String(row.sender_id ?? ''),
    senderName: String(row.sender_name ?? 'User'),
    text: String(row.text ?? ''),
    createdAt: String(row.created_at ?? ''),
  }));
}

export async function sendMessage(uid: string, buddyId: string, text: string): Promise<void> {
  if (!supabase || !buddyId || !text.trim()) {
    return;
  }

  const { error } = await supabase.from('direct_messages').insert({
    sender_id: uid,
    recipient_id: buddyId,
    sender_name: 'You',
    text: text.trim(),
    created_at: new Date().toISOString(),
    is_read: false,
  });

  if (error) {
    throw error;
  }
}

export function subscribeConversations(uid: string, onUpdate: (items: Conversation[]) => void): () => void {
  let cancelled = false;

  const run = async () => {
    const items = await getConversations(uid);
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

export function subscribeMessages(uid: string, buddyId: string, onUpdate: (items: ChatMessage[]) => void): () => void {
  let cancelled = false;

  const run = async () => {
    const items = await getMessages(uid, buddyId);
    if (!cancelled) {
      onUpdate(items);
    }
  };

  void run();
  const id = setInterval(() => {
    void run();
  }, 2000);

  return () => {
    cancelled = true;
    clearInterval(id);
  };
}
