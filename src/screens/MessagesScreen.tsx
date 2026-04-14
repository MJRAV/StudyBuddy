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
  isMine?: boolean;
  isRead?: boolean;
  seenByCount?: number;
};

type GroupConversation = {
  groupId: string;
  groupName: string;
  course: string;
  lastMessage: string;
  participantIds: string[];
};

type Props = { uid: string };

export function MessagesScreen({ uid }: Props) {
  const [conversations, setConversations] = useState<BuddyConversation[]>([]);
  const [activeBuddyId, setActiveBuddyId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'list' | 'chat'>('list');
  const [tab, setTab] = useState<'direct' | 'groups'>('direct');
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [groupDraft, setGroupDraft] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      if (!supabase) {
        return;
      }

      const [buddiesResp, dmResp, groupsResp] = await Promise.all([
        supabase.from('buddies').select('buddy_id,name,role').eq('owner_id', uid),
        supabase
          .from('direct_messages')
          .select('id,sender_id,recipient_id,sender_name,text,is_read,created_at')
          .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('study_groups')
          .select('id,name,course,member_ids,owner_id')
          .order('updated_at', { ascending: false }),
      ]);

      if (!active || buddiesResp.error || dmResp.error || groupsResp.error) {
        return;
      }
      const buddyRows = buddiesResp.data ?? [];
      const dmRows = dmResp.data ?? [];
      const groupRows = groupsResp.data ?? [];

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

      const myGroups = groupRows.filter((row) => {
        const ownerId = String(row.owner_id ?? '');
        if (ownerId === uid) return true;
        const memberIds = Array.isArray(row.member_ids)
          ? row.member_ids.map((item: unknown) => String(item))
          : [];
        return memberIds.includes(uid);
      });

      const groupIds = myGroups
        .map((row) => String(row.id ?? ''))
        .filter((id) => id.length > 0);

      const lastByGroup = new Map<string, string>();

      if (groupIds.length > 0) {
        const msgsResp = await supabase
          .from('study_group_messages')
          .select('group_id,sender_id,text,created_at')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false });

        if (!msgsResp.error) {
          const latestByGroup = new Map<string, { senderId: string; text: string }>();
          const senderIds = new Set<string>();

          for (const row of msgsResp.data ?? []) {
            const gid = String((row as { group_id?: unknown }).group_id ?? '');
            if (!gid || latestByGroup.has(gid)) {
              continue;
            }

            const senderId = String((row as { sender_id?: unknown }).sender_id ?? '');
            const text = String((row as { text?: unknown }).text ?? '');

            latestByGroup.set(gid, { senderId, text });
            if (senderId) {
              senderIds.add(senderId);
            }
          }

          const nameById = new Map<string, string>();

          if (senderIds.size > 0) {
            const usersResp = await supabase
              .from('users')
              .select('uid,name')
              .in('uid', Array.from(senderIds));

            if (!usersResp.error) {
              for (const row of usersResp.data ?? []) {
                const id = String((row as { uid?: unknown }).uid ?? '');
                const name = String((row as { name?: unknown }).name ?? '');
                if (id && name) {
                  nameById.set(id, name);
                }
              }
            }
          }

          for (const [gid, { senderId, text }] of latestByGroup.entries()) {
            const isMe = senderId === uid;
            const resolvedName = nameById.get(senderId);
            const baseName = resolvedName && resolvedName.trim().length > 0
              ? resolvedName.trim()
              : isMe
                ? 'You'
                : 'Student';
            const preview = text ? `${baseName}: ${text}` : baseName;
            lastByGroup.set(gid, preview);
          }
        }
      }

      setGroupConversations(
        myGroups.map((row) => {
          const gid = String(row.id ?? '');
          const ownerId = String(row.owner_id ?? '');
          const memberIds = Array.isArray(row.member_ids)
            ? row.member_ids.map((item: unknown) => String(item)).filter((id) => id.length > 0)
            : [];
          const participantIds = Array.from(new Set([ownerId, ...memberIds])).filter((id) => id.length > 0);
          return {
            groupId: gid,
            groupName: String(row.name ?? 'Study Group'),
            course: String(row.course ?? 'General'),
            lastMessage: lastByGroup.get(gid) ?? '',
            participantIds,
          };
        }),
      );
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
    if (!activeBuddyId || !supabase || mode !== 'chat' || tab !== 'direct') {
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
        (data ?? []).map((row) => {
          const senderId = String(row.sender_id ?? '');
          const isMine = senderId === uid;
          return {
            id: String(row.id ?? ''),
            senderId,
            senderName: String(row.sender_name ?? 'User'),
            text: String(row.text ?? ''),
            createdAt: String(row.created_at ?? ''),
            isMine,
            isRead: Boolean(row.is_read),
          } as ChatMessage;
        }),
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
  }, [uid, activeBuddyId, mode, tab]);

  useEffect(() => {
    if (!activeGroupId || !supabase || mode !== 'chat' || tab !== 'groups') {
      setGroupMessages([]);
      return;
    }

    const client = supabase;
    let active = true;

    const fetch = async () => {
      const activeGroup = groupConversations.find((item) => item.groupId === activeGroupId);
      const participantIds = activeGroup?.participantIds ?? [];

      const [messagesResp, readsResp] = await Promise.all([
        client
          .from('study_group_messages')
          .select('id,sender_id,sender_name,text,created_at')
          .eq('group_id', activeGroupId)
          .order('created_at', { ascending: true }),
        client
          .from('study_group_read_states')
          .select('user_id,last_seen_at')
          .eq('group_id', activeGroupId),
      ]);

      if (!active || messagesResp.error) {
        return;
      }

      const lastSeenByUser = new Map<string, number>();
      if (!readsResp.error) {
        for (const row of readsResp.data ?? []) {
          const readerId = String((row as { user_id?: unknown }).user_id ?? '');
          const seenAtRaw = String((row as { last_seen_at?: unknown }).last_seen_at ?? '');
          const seenAt = Date.parse(seenAtRaw);
          if (readerId && Number.isFinite(seenAt)) {
            lastSeenByUser.set(readerId, seenAt);
          }
        }
      }

      const totalOtherParticipants = participantIds.filter((id) => id !== uid).length;

      setGroupMessages(
        (messagesResp.data ?? []).map((row) => {
          const senderId = String(row.sender_id ?? '');
          const createdAt = String(row.created_at ?? '');
          const createdTs = Date.parse(createdAt);
          const seenByCount = senderId === uid && Number.isFinite(createdTs)
            ? participantIds.reduce((count, participantId) => {
                if (participantId === uid) {
                  return count;
                }
                const participantSeenAt = lastSeenByUser.get(participantId);
                return participantSeenAt !== undefined && participantSeenAt >= createdTs
                  ? count + 1
                  : count;
              }, 0)
            : 0;

          return {
            id: String(row.id ?? ''),
            senderId,
            senderName: String(row.sender_name ?? 'User'),
            text: String(row.text ?? ''),
            createdAt,
            seenByCount,
            isRead: senderId === uid ? totalOtherParticipants > 0 && seenByCount > 0 : undefined,
          };
        }),
      );

      await client
        .from('study_group_read_states')
        .upsert(
          {
            group_id: activeGroupId,
            user_id: uid,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'group_id,user_id' },
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
  }, [activeGroupId, mode, tab, groupConversations, uid]);

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

  const filteredGroupConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return groupConversations;
    }
    return groupConversations.filter((g) => {
      return (
        g.groupName.toLowerCase().includes(term) ||
        g.course.toLowerCase().includes(term) ||
        g.lastMessage.toLowerCase().includes(term)
      );
    });
  }, [groupConversations, search]);

  const sendGroupMessage = async () => {
    if (!supabase || !activeGroupId || !groupDraft.trim()) {
      return;
    }

    const text = groupDraft.trim();

    let senderName: string = 'You';
    try {
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('uid', uid)
        .maybeSingle();
      if (data && 'name' in data && typeof data.name === 'string' && data.name.trim()) {
        senderName = data.name.trim();
      }
    } catch {
      // fall back to 'You' if lookup fails
    }

    await supabase.from('study_group_messages').insert({
      group_id: activeGroupId,
      sender_id: uid,
      sender_name: senderName,
      text,
      created_at: new Date().toISOString(),
    });

    setGroupDraft('');

    setGroupConversations((prev) =>
      prev.map((g) =>
        g.groupId === activeGroupId
          ? {
              ...g,
              lastMessage: `You: ${text}`,
            }
          : g,
      ),
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <>
          <Heading>Messages</Heading>
          <Subheading>Search conversations and pick who to chat with</Subheading>

          <View style={styles.segmentWrap}>
            <Pressable
              style={[styles.segmentItem, tab === 'direct' && styles.segmentItemActive]}
              onPress={() => {
                setTab('direct');
                setMode('list');
                setActiveGroupId('');
              }}
            >
              <Text
                style={[styles.segmentLabel, tab === 'direct' && styles.segmentLabelActive]}
              >
                Buddies
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentItem, tab === 'groups' && styles.segmentItemActive]}
              onPress={() => {
                setTab('groups');
                setMode('list');
                setActiveBuddyId('');
              }}
            >
              <Text
                style={[styles.segmentLabel, tab === 'groups' && styles.segmentLabelActive]}
              >
                Groups
              </Text>
            </Pressable>
          </View>

          <AppInput
            placeholder={tab === 'direct' ? 'Search conversations...' : 'Search groups...'}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />

          {tab === 'direct' && mode === 'list' ? (
          <>
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
          ) : null}

          {tab === 'direct' && mode === 'chat' ? (
            <>
              <View style={styles.chatHeader}>
                <Pressable onPress={() => setMode('list')} style={styles.backButton}>
                  <Text style={styles.backGlyph}>{'<'}</Text>
                </Pressable>
                {activeConversation ? (
                  <>
                    <View style={styles.avatarCircle}>
                      {activeConversation.avatarUrl ? (
                        <Image
                          source={{ uri: activeConversation.avatarUrl }}
                          style={styles.avatarImage}
                        />
                      ) : null}
                    </View>
                    <View style={styles.chatHeaderText}>
                      <Text style={styles.chatTitle}>{activeConversation.buddyName}</Text>
                      <Text style={styles.chatSubtitle}>
                        {activeConversation.buddyRole || 'mentor'} • Online
                      </Text>
                    </View>
                  </>
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
                        <Text style={[styles.msgText, msg.senderId === uid && styles.msgTextMine]}>
                          {msg.text}
                        </Text>
                        {msg.senderId === uid ? (
                          <Text
                            style={[
                              styles.msgMeta,
                              msg.senderId === uid && styles.msgMetaMine,
                            ]}
                          >
                            {msg.isRead ? 'Seen' : 'Sent'}
                          </Text>
                        ) : null}
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
          ) : null}

          {tab === 'groups' && mode === 'list' ? (
            <ScrollView style={styles.listWrap} contentContainerStyle={styles.listContent}>
              {filteredGroupConversations.map((item) => (
                <Pressable
                  key={item.groupId}
                  style={styles.listRow}
                  onPress={() => {
                    setActiveGroupId(item.groupId);
                    setMode('chat');
                  }}
                >
                  <View style={styles.listTextWrap}>
                    <Text style={styles.listName}>{item.groupName}</Text>
                    <Text style={styles.listPreview}>
                      {item.lastMessage || 'Start a group conversation'}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {filteredGroupConversations.length === 0 ? (
                <Text style={styles.emptyText}>No group conversations yet.</Text>
              ) : null}
            </ScrollView>
          ) : null}
          {tab === 'groups' && mode === 'chat' ? (
            <>
              <View style={styles.chatHeader}>
                <Pressable
                  onPress={() => {
                    setMode('list');
                    setActiveGroupId('');
                  }}
                  style={styles.backButton}
                >
                  <Text style={styles.backGlyph}>{'<'}</Text>
                </Pressable>
                {(() => {
                  const activeGroup = groupConversations.find(
                    (g) => g.groupId === activeGroupId,
                  );
                  if (!activeGroup) return null;
                  const initial =
                    activeGroup.groupName && activeGroup.groupName.length > 0
                      ? activeGroup.groupName[0].toUpperCase()
                      : '#';
                  return (
                    <>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>{initial}</Text>
                      </View>
                      <View style={styles.chatHeaderText}>
                        <Text style={styles.chatTitle}>{activeGroup.groupName}</Text>
                        <Text style={styles.chatSubtitle}>{activeGroup.course}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>

              <Card style={styles.chatCard}>
                <ScrollView style={styles.chatWrap} contentContainerStyle={styles.chatContent}>
                  {groupMessages.length === 0 ? (
                    <View style={styles.empty}>
                      <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
                    </View>
                  ) : (
                    groupMessages.map((msg) => (
                      <View
                        key={msg.id}
                        style={[
                          styles.msgBubble,
                          msg.senderId === uid ? styles.mine : styles.theirs,
                        ]}
                      >
                        {msg.senderId !== uid ? (
                          <Text style={styles.msgSender}>{msg.senderName}</Text>
                        ) : null}
                        <Text
                          style={[
                            styles.msgText,
                            msg.senderId === uid && styles.msgTextMine,
                          ]}
                        >
                          {msg.text}
                        </Text>
                        {msg.senderId === uid ? (
                          <Text style={[styles.msgMeta, styles.msgMetaMine]}>
                            {msg.seenByCount && msg.seenByCount > 0
                              ? `Seen by ${msg.seenByCount}`
                              : 'Sent'}
                          </Text>
                        ) : null}
                      </View>
                    ))
                  )}
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
            </>
          ) : null}
        </>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  msgSender: {
    marginBottom: 2,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  msgMeta: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textMuted,
  },
  msgMetaMine: {
    color: colors.white,
  },
  avatarInitial: {
    color: colors.green,
    fontWeight: '700',
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
