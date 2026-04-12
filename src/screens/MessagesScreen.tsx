import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { AppButton, AppInput, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type BuddyConversation = {
  buddyId: string;
  buddyName: string;
  buddyRole: string;
  avatarUrl: string;
  lastMessage: string;
  unread: number;
};

type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
};

type Props = { uid: string };

export function MessagesScreen({ uid }: Props) {
  const [conversations, setConversations] = useState<BuddyConversation[]>([]);
  const [activeBuddyId, setActiveBuddyId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'list' | 'chat'>('list');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [buddiesResp, dmResp] = await Promise.all([
        supabase.from('buddies').select('buddy_id,name,role').eq('owner_id', uid),
        supabase
          .from('direct_messages')
          .select('id,sender_id,recipient_id,sender_name,text,is_read,created_at')
          .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
          .order('created_at', { ascending: false }),
      ]);

      if (!active || buddiesResp.error || dmResp.error) {
        return;
      }
      const buddyRows = buddiesResp.data ?? [];
      const dmRows = dmResp.data ?? [];

      const buddyIds = buddyRows
        .map((item) => String(item.buddy_id ?? ''))
        .filter((id) => id.length > 0);

      const avatarById = new Map<string, string>();
      if (buddyIds.length > 0) {
        const usersResp = await supabase
          .from('users')
          .select('uid,avatar_url')
          .in('uid', buddyIds);

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

      const mapped = buddyRows.map((item) => {
        const buddyId = String(item.buddy_id ?? '');
        const thread = dmRows.filter((row) => {
          const sender = String(row.sender_id ?? '');
          const recipient = String(row.recipient_id ?? '');
          return (sender === uid && recipient === buddyId) || (sender === buddyId && recipient === uid);
        });

        return {
          buddyId,
          buddyName: String(item.name ?? 'Buddy'),
          buddyRole: String(item.role ?? ''),
          avatarUrl: avatarById.get(buddyId) ?? '',
          lastMessage: thread[0] ? String(thread[0].text ?? '') : '',
          unread: thread.filter((row) => String(row.recipient_id ?? '') === uid && !Boolean(row.is_read)).length,
        };
      });

      setConversations(mapped);
    };

    void fetch();
    const id = setInterval(() => {
      void fetch();
    }, 3000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [uid]);

  useEffect(() => {
    if (!activeBuddyId || !supabase || mode !== 'chat') {
      setMessages([]);
      return;
    }

    const client = supabase;
    let active = true;

    const fetch = async () => {
      const { data, error } = await client
        .from('direct_messages')
        .select('id,sender_id,sender_name,text,created_at,recipient_id,is_read')
        .or(`and(sender_id.eq.${uid},recipient_id.eq.${activeBuddyId}),and(sender_id.eq.${activeBuddyId},recipient_id.eq.${uid})`)
        .order('created_at', { ascending: true });

      if (!active || error) {
        return;
      }

      setMessages(
        (data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          senderId: String(row.sender_id ?? ''),
          senderName: String(row.sender_name ?? 'User'),
          text: String(row.text ?? ''),
          createdAt: String(row.created_at ?? ''),
        })),
      );

      await client
        .from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', activeBuddyId)
        .eq('recipient_id', uid)
        .eq('is_read', false);
    };

    void fetch();
    const id = setInterval(() => {
      void fetch();
    }, 2000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [uid, activeBuddyId, mode]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.buddyId === activeBuddyId) ?? null,
    [conversations, activeBuddyId],
  );

  const sendMessage = async () => {
    if (!supabase || !activeBuddyId || !draft.trim()) {
      return;
    }

    await supabase.from('direct_messages').insert({
      sender_id: uid,
      recipient_id: activeBuddyId,
      sender_name: 'You',
      text: draft.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    });

    setDraft('');
  };

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return conversations;
    }
    return conversations.filter((c) => {
      return (
        c.buddyName.toLowerCase().includes(term) ||
        c.lastMessage.toLowerCase().includes(term)
      );
    });
  }, [conversations, search]);

  return (
    <Screen>
      <View style={styles.container}>
        {mode === 'list' ? (
          <>
            <Heading>Messages</Heading>
            <Subheading>Search conversations and pick who to chat with</Subheading>

            <AppInput
              placeholder="Search conversations..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />

            <ScrollView style={styles.listWrap} contentContainerStyle={styles.listContent}>
              {filteredConversations.map((item) => (
                <Pressable
                  key={item.buddyId}
                  style={styles.listRow}
                  onPress={() => {
                    setActiveBuddyId(item.buddyId);
                    setMode('chat');
                  }}
                >
                  <View style={styles.avatarCircle}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                    ) : null}
                  </View>
                  <View style={styles.listTextWrap}>
                    <Text style={styles.listName}>{item.buddyName}</Text>
                    <Text style={styles.listPreview}>{item.lastMessage || 'Start a conversation'}</Text>
                  </View>
                  {item.unread > 0 ? (
                    <View style={styles.unreadPill}>
                      <Text style={styles.unreadPillText}>{item.unread}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
              {filteredConversations.length === 0 ? (
                <Text style={styles.emptyText}>No conversations yet.</Text>
              ) : null}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.chatHeader}>
              <Pressable onPress={() => setMode('list')} style={styles.backButton}>
                <Text style={styles.backGlyph}>{'<'}</Text>
              </Pressable>
              {activeConversation ? (
                <View style={styles.chatHeaderText}>
                  <Text style={styles.chatTitle}>{activeConversation.buddyName}</Text>
                  <Text style={styles.chatSubtitle}>
                    {activeConversation.buddyRole || 'mentor'} • Online
                  </Text>
                </View>
              ) : null}
            </View>

            {!activeConversation ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Select a conversation from the list.</Text>
              </View>
            ) : (
              <Card style={styles.chatCard}>
                <ScrollView style={styles.chatWrap} contentContainerStyle={styles.chatContent}>
                  {messages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[styles.msgBubble, msg.senderId === uid ? styles.mine : styles.theirs]}
                    >
                      <Text style={[styles.msgText, msg.senderId === uid && styles.msgTextMine]}>{msg.text}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.composeRow}>
                  <AppInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Type a message..."
                    style={styles.composeInput}
                  />
                  <View style={styles.sendWrap}>
                    <AppButton text="Send" onPress={() => void sendMessage()} />
                  </View>
                </View>
              </Card>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    marginTop: 14,
    marginBottom: 8,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenSoft,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  listTextWrap: {
    flex: 1,
  },
  listName: {
    fontWeight: '700',
    color: colors.textStrong,
  },
  listPreview: {
    marginTop: 2,
    color: colors.textBody,
  },
  unreadPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.greenSoft,
  },
  unreadPillText: {
    color: colors.green,
    fontWeight: '700',
    fontSize: 11,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
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
