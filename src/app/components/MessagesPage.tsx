import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Send, Search } from 'lucide-react';

const mockConversations = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Mentor',
    lastMessage: 'I can help you with that algorithm problem!',
    time: '10m ago',
    unread: 2,
  },
  {
    id: 2,
    name: 'Mike Chen',
    role: 'Mentee',
    lastMessage: 'Thanks for the study materials',
    time: '1h ago',
    unread: 0,
  },
  {
    id: 3,
    name: 'Emma Davis',
    role: 'Mentor',
    lastMessage: 'Let me know if you need more clarification',
    time: '2d ago',
    unread: 0,
  },
];

const mockMessages = [
  { id: 1, sender: 'Sarah Johnson', text: 'Hi! How can I help you today?', time: '10:30 AM', isMine: false },
  { id: 2, sender: 'You', text: 'I\'m struggling with binary search trees', time: '10:32 AM', isMine: true },
  { id: 3, sender: 'Sarah Johnson', text: 'I can help you with that algorithm problem!', time: '10:35 AM', isMine: false },
];

export function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In production, send to backend
      setNewMessage('');
    }
  };

  const filteredConversations = mockConversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-full md:w-96 border-r border-gray-200 bg-white">
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
              onClick={() => setSelectedConversation(conv.id)}
              className={`w-full p-4 text-left transition-colors hover:bg-green-50 ${
                selectedConversation === conv.id ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
                  <p className="text-xs text-zinc-400">{conv.time}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="hidden md:flex md:flex-1 md:flex-col">
          <div className="border-b border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">Sarah Johnson</h2>
                <p className="text-sm text-zinc-600">Mentor • Online</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-amber-50 p-4">
            {mockMessages.map((msg) => (
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
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
