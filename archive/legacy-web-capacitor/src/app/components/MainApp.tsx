import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { CommunityWall } from '@/app/components/CommunityWall';
import { MessagesPage } from '@/app/components/MessagesPage';
import { FindMentor } from '@/app/components/FindMentor';
import { BuddyPage } from '@/app/components/BuddyPage';
import { ProfilePage } from '@/app/components/ProfilePage';
import { NotificationsPage } from '@/app/components/NotificationsPage';
import { AdminPage } from './AdminPage';
import { Bell, Home, MessageCircle, Search, Users, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getCurrentUserId } from '@/app/lib/authService';
import {
  materializeAcceptedConnections,
  subscribeUnreadPostNotificationsCount,
  subscribeIncomingFriendRequests,
  type FriendRequest,
} from '@/app/lib/socialService';

export function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = getCurrentUserId();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [unreadPostNotifications, setUnreadPostNotifications] = useState(0);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe = subscribeIncomingFriendRequests(userId, setIncomingRequests);
    const unsubscribePost = subscribeUnreadPostNotificationsCount(userId, setUnreadPostNotifications);
    return () => {
      unsubscribe?.();
      unsubscribePost?.();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void materializeAcceptedConnections(userId);

    const interval = window.setInterval(() => {
      void materializeAcceptedConnections(userId);
    }, 6000);

    return () => {
      window.clearInterval(interval);
    };
  }, [userId]);

  const pendingRequestCount = useMemo(
    () => incomingRequests.filter((item) => item.status === 'pending').length,
    [incomingRequests],
  );

  const totalNotificationCount = pendingRequestCount + unreadPostNotifications;

  const navItems = [
    { path: '/app/community', icon: Home, label: 'Community' },
    { path: '/app/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/app/notifications', icon: Bell, label: 'Alerts' },
    { path: '/app/find-mentor', icon: Search, label: 'Find Mentor' },
    { path: '/app/buddies', icon: Users, label: 'Buddies' },
    { path: '/app/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex h-screen flex-col bg-amber-50">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/community" element={<CommunityWall />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/find-mentor" element={<FindMentor />} />
          <Route path="/buddies" element={<BuddyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around px-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors ${
                  isActive ? 'text-green-600' : 'text-zinc-600'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.path === '/app/notifications' && totalNotificationCount > 0 ? (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                      {totalNotificationCount > 9 ? '9+' : totalNotificationCount}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}