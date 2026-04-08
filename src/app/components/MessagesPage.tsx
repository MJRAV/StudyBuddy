import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Send, Search, ChevronLeft } from 'lucide-react';
import { isFirebaseConfigured } from '@/app/lib/firebase';
import {
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
  type ChatMessage,
  type Conversation,
} from '@/app/lib/messagesService';
import { getCurrentUserId } from '@/app/lib/authService';

function formatMessageTime(timestampMs: number): string {
  if (!timestampMs) {
    return '';
  }

  return new Date(timestampMs).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MessagesPage() {
  const userId = getCurrentUserId();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !userId) {
      return;
    }

    const unsubscribe = subscribeToConversations(userId, (items) => {
      setConversations(items);
      setSelectedConversation((current) => {
        if (!items.length) {
          return null;
        }

        if (current && items.some((item) => item.id === current)) {
          return current;
        }

        return items[0].id;
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedConversation || !userId) {
      setMessages([]);
      return;
    }

    if (!isFirebaseConfigured) {
      return;
    }

    const unsubscribe = subscribeToMessages(userId, selectedConversation, (items) => {
      setMessages(items);
    });

    return () => {
      unsubscribe?.();
    };
  }, [selectedConversation, userId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) {
      return;
    }

    if (!isFirebaseConfigured) {
      return;
    }

    await sendMessage(userId, selectedConversation, {
      text: newMessage.trim(),
      senderId: userId,
      senderName: localStorage.getItem('userName') || 'User',
    });
    setNewMessage('');
  };

  const filteredConversations = useMemo(
    () => conversations.filter((conv) => conv.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [conversations, searchQuery],
  );

  const activeConversation = conversations.find((conv) => conv.id === selectedConversation);

  if (!isFirebaseConfigured) {
    return (
      <div className="flex h-full items-center justify-center bg-amber-50 p-6 text-center text-zinc-600">
        Supabase is not configured for this app.
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center bg-amber-50 p-6 text-center text-zinc-600">
        Please sign in to view your messages.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div
        className={`w-full border-r border-gray-200 bg-white md:w-96 ${
          isMobileChatOpen ? 'hidden md:block' : 'block'
        }`}
      >
        <div className="p-4">
          <h1 className="mb-4 text-2xl font-bold">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="divide-y">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setSelectedConversation(conv.id);
                setIsMobileChatOpen(true);
              }}
              className={`w-full p-4 text-left transition-colors hover:bg-green-50 ${
                selectedConversation === conv.id ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar>
                  {conv.avatarUrl ? (
                    <img
                      src={conv.avatarUrl}
                      alt={conv.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{conv.name}</h3>
                      <Badge className={conv.role === 'Mentor' ? 'bg-green-600 text-white text-xs' : 'bg-green-100 text-green-700 text-xs'}>
                        {conv.role}
                      </Badge>
                    </div>
                    {conv.unread > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-zinc-600">{conv.lastMessage}</p>
                </div>
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">No conversations yet.</div>
          ) : null}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className={`flex-1 flex-col ${isMobileChatOpen ? 'flex' : 'hidden'} md:flex`}>
          <div className="border-b border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileChatOpen(false)}
                className="mr-1 rounded-md p-1 text-zinc-600 hover:bg-zinc-100 md:hidden"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Avatar>
                {activeConversation?.avatarUrl ? (
                  <img
                    src={activeConversation.avatarUrl}
                    alt={activeConversation.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <AvatarFallback>
                    {activeConversation ? activeConversation.name.split(' ').map((n) => n[0]).join('') : 'SB'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="font-semibold">{activeConversation?.name ?? 'StudyBuddy'}</h2>
                <p className="text-sm text-zinc-600">{activeConversation?.role ?? 'Member'} • Online</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-amber-50 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 ${
                    msg.isMine ? 'bg-green-600 text-white' : 'bg-white text-zinc-900'
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`mt-1 text-xs ${msg.isMine ? 'text-green-100' : 'text-zinc-500'}`}>
                    {formatMessageTime(msg.createdAtMs)}
                  </p>
                  {msg.isMine ? (
                    <p className={`mt-1 text-xs ${msg.isMine ? 'text-green-100' : 'text-zinc-500'}`}>
                      {msg.isRead ? 'Seen' : 'Sent'}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">No messages in this conversation yet.</p>
            ) : null}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex md:flex-1 md:items-center md:justify-center md:bg-amber-50">
          <p className="text-zinc-500">Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
}
