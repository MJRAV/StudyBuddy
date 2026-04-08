import { supabase } from "@/app/lib/firebase";

type Unsubscribe = () => void;

export type Conversation = {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  unread: number;
  avatarUrl: string;
};

export type ChatMessage = {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  createdAtMs: number;
  isMine: boolean;
  isRead: boolean;
};

export function subscribeToConversations(
  userId: string,
  onData: (conversations: Conversation[]) => void,
): Unsubscribe | null {
  if (!supabase) {
    return null;
  }
  const client = supabase;

  let active = true;

  const fetch = async () => {
    const [buddiesResp, messagesResp] = await Promise.all([
      client
        .from("buddies")
        .select("buddy_id,name,role")
        .eq("owner_id", userId)
        .order("added_at", { ascending: false }),
      client
        .from("direct_messages")
        .select("sender_id,recipient_id,text,created_at,is_read")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
    ]);

    if (!active || buddiesResp.error || messagesResp.error) {
      return;
    }

    const latestByBuddy: Record<string, { text: string; createdAt: string }> = {};
    const unreadByBuddy: Record<string, number> = {};
    const buddyIds = new Set<string>();

    for (const row of messagesResp.data ?? []) {
      const senderId = String(row.sender_id ?? "");
      const recipientId = String(row.recipient_id ?? "");
      const buddyId = senderId === userId ? recipientId : senderId;
      if (!buddyId) {
        continue;
      }

      buddyIds.add(buddyId);

      if (!latestByBuddy[buddyId]) {
        latestByBuddy[buddyId] = {
          text: String(row.text ?? ""),
          createdAt: String(row.created_at ?? ""),
        };
      }

      const isUnreadIncoming = recipientId === userId && !Boolean(row.is_read);
      if (isUnreadIncoming) {
        unreadByBuddy[buddyId] = (unreadByBuddy[buddyId] ?? 0) + 1;
      }
    }

    const { data: avatarRows } = buddyIds.size
      ? await client.from('users').select('uid,avatar_url').in('uid', Array.from(buddyIds))
      : { data: [] as Array<{ uid?: unknown; avatar_url?: unknown }> };

    const avatarByUid = new Map(
      (avatarRows ?? []).map((item) => [String(item.uid ?? ''), String(item.avatar_url ?? '')]),
    );

    const conversations: Conversation[] = (buddiesResp.data ?? []).map((item) => {
      const buddyId = String(item.buddy_id ?? "");
      const latest = latestByBuddy[buddyId];
      return {
        id: buddyId,
        name: String(item.name ?? "Unknown"),
        role: String(item.role ?? "Member"),
        lastMessage: latest?.text ?? "",
        unread: unreadByBuddy[buddyId] ?? 0,
        avatarUrl: avatarByUid.get(buddyId) ?? '',
      };
    });

    conversations.sort((a, b) => {
      const aTs = latestByBuddy[a.id]?.createdAt ?? "";
      const bTs = latestByBuddy[b.id]?.createdAt ?? "";
      return bTs.localeCompare(aTs);
    });

    onData(conversations);
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

export function subscribeToMessages(
  userId: string,
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
): Unsubscribe | null {
  if (!supabase) {
    return null;
  }
  const client = supabase;
  const buddyId = conversationId;

  let active = true;

  const fetch = async () => {
    const { data, error } = await client
      .from("direct_messages")
      .select("id,text,sender_id,sender_name,created_at,is_read")
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${buddyId}),and(sender_id.eq.${buddyId},recipient_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true });

    if (!active || error) {
      return;
    }

    onData(
      (data ?? []).map((item) => ({
        id: String(item.id),
        text: String(item.text ?? ""),
        senderName: String(item.sender_name ?? "Unknown"),
        senderId: String(item.sender_id ?? "unknown"),
        createdAtMs: item.created_at ? new Date(item.created_at).getTime() : 0,
        isMine: String(item.sender_id ?? "") === userId,
        isRead: Boolean(item.is_read),
      })),
    );

    await client
      .from("direct_messages")
      .update({ is_read: true })
      .eq("sender_id", buddyId)
      .eq("recipient_id", userId)
      .eq("is_read", false);
  };

  void fetch();
  const interval = window.setInterval(() => {
    void fetch();
  }, 2000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  payload: { text: string; senderId: string; senderName: string },
): Promise<void> {
  if (!supabase) {
    return;
  }
  const client = supabase;

  const { error: messageError } = await client.from("direct_messages").insert({
    sender_id: userId,
    recipient_id: conversationId,
    text: payload.text,
    sender_name: payload.senderName,
    created_at: new Date().toISOString(),
    is_read: false,
  });

  if (messageError) {
    throw messageError;
  }
}
