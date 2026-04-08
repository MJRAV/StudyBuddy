import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { isFirebaseConfigured, supabase } from '@/app/lib/firebase';
import { getCurrentUserId } from '@/app/lib/authService';

type ConversationRow = {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  unread: number;
};

type MessageRow = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
};

type CommunityPostRow = {
  id: string;
  authorId: string;
  content: string;
};

export function AdminPage() {
  const navigate = useNavigate();
  const uid = getCurrentUserId();

  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPostRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !supabase || !uid) {
      return;
    }
    const client = supabase;

    let active = true;

    const load = async () => {
      const [profileResp, conversationsResp, postsResp] = await Promise.all([
        client.from('users').select('*').eq('uid', uid).maybeSingle(),
        client
          .from('conversations')
          .select('id,name,role,last_message,unread')
          .eq('owner_id', uid)
          .order('updated_at', { ascending: false }),
        client
          .from('community_posts')
          .select('id,author_id,content')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (!active) {
        return;
      }

      if (profileResp.error || conversationsResp.error || postsResp.error) {
        setError(profileResp.error?.message || conversationsResp.error?.message || postsResp.error?.message || 'Failed to load admin data.');
        return;
      }

      setUserProfile((profileResp.data as Record<string, unknown> | null) ?? null);

      const rows: ConversationRow[] = (conversationsResp.data ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.name ?? 'Unknown'),
        role: String(row.role ?? 'Member'),
        lastMessage: String(row.last_message ?? ''),
        unread: Number(row.unread ?? 0),
      }));

      setConversations(rows);
      setSelectedConversationId((current) => {
        if (current && rows.some((r) => r.id === current)) {
          return current;
        }

        return rows[0]?.id ?? '';
      });

      const posts: CommunityPostRow[] = (postsResp.data ?? []).map((row) => ({
        id: String(row.id),
        authorId: String(row.author_id ?? ''),
        content: String(row.content ?? ''),
      }));
      setCommunityPosts(posts);
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [uid]);

  useEffect(() => {
    if (!isFirebaseConfigured || !supabase || !uid || !selectedConversationId) {
      return;
    }
    const client = supabase;

    let active = true;

    const loadMessages = async () => {
      const { data, error } = await client
        .from('messages')
        .select('id,sender_id,sender_name,text')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setError(error.message);
        return;
      }

      const rows: MessageRow[] = (data ?? []).map((row) => ({
        id: String(row.id),
        senderId: String(row.sender_id ?? ''),
        senderName: String(row.sender_name ?? ''),
        text: String(row.text ?? ''),
      }));
      setMessages(rows);
    };

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [uid, selectedConversationId]);

  const statusText = useMemo(() => {
    if (!isFirebaseConfigured) {
      return 'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env.';
    }

    if (!uid) {
      return 'No authenticated user. Log in first to view account data.';
    }

    return '';
  }, [uid]);

  return (
    <div className="min-h-screen bg-amber-50 p-4 pb-24">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/app/profile')}
            className="flex items-center gap-2 text-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Profile</span>
          </button>
          <Badge className="bg-green-600 text-white">Admin Data Viewer</Badge>
        </div>

        {statusText ? (
          <Card>
            <CardContent className="pt-6 text-sm text-zinc-700">{statusText}</CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Accounts Collection: users/{uid}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
              {JSON.stringify(userProfile, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversations ({conversations.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.map((conv) => (
                <Button
                  key={conv.id}
                  type="button"
                  variant={selectedConversationId === conv.id ? 'default' : 'outline'}
                  className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                  onClick={() => setSelectedConversationId(conv.id)}
                >
                  <div>
                    <div className="font-semibold">{conv.name} ({conv.role})</div>
                    <div className="text-xs">{conv.lastMessage || '(no last message)'}</div>
                    <div className="text-xs">unread: {conv.unread}</div>
                  </div>
                </Button>
              ))}
              {conversations.length === 0 ? <p className="text-sm text-zinc-500">No conversation docs yet.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="rounded border p-3 text-sm">
                  <div className="font-medium">{msg.senderName} ({msg.senderId})</div>
                  <div className="text-zinc-700">{msg.text}</div>
                </div>
              ))}
              {messages.length === 0 ? <p className="text-sm text-zinc-500">No messages for this conversation.</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Community Posts ({communityPosts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {communityPosts.map((post) => (
              <div key={post.id} className="rounded border p-3 text-sm">
                <div className="text-xs text-zinc-500">authorId: {post.authorId}</div>
                <div>{post.content || '(empty content)'}</div>
              </div>
            ))}
            {communityPosts.length === 0 ? <p className="text-sm text-zinc-500">No community post docs yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
