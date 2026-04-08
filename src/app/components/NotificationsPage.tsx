import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId } from '@/app/lib/authService';
import {
  respondToFriendRequest,
  subscribeIncomingFriendRequests,
  subscribeOutgoingFriendRequests,
  type FriendRequest,
} from '@/app/lib/socialService';

export function NotificationsPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [busyRequestId, setBusyRequestId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribeIncoming = subscribeIncomingFriendRequests(userId, setIncomingRequests);
    const unsubscribeOutgoing = subscribeOutgoingFriendRequests(userId, setOutgoingRequests);

    return () => {
      unsubscribeIncoming?.();
      unsubscribeOutgoing?.();
    };
  }, [userId]);

  const pendingIncoming = useMemo(
    () => incomingRequests.filter((item) => item.status === 'pending'),
    [incomingRequests],
  );

  const handleDecision = async (request: FriendRequest, decision: 'accepted' | 'declined') => {
    if (!userId) {
      return;
    }

    try {
      setError('');
      setBusyRequestId(request.id);
      await respondToFriendRequest(userId, request, decision);
      if (decision === 'accepted') {
        navigate('/app/buddies');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to process request.';
      setError(message);
    } finally {
      setBusyRequestId('');
    }
  };

  return (
    <div className="mx-auto max-w-3xl min-h-screen bg-amber-50 p-4">
      <div className="mb-5 flex items-center gap-2">
        <Bell className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold">Notifications</h1>
        {pendingIncoming.length > 0 ? (
          <Badge className="bg-green-600 text-white">{pendingIncoming.length} new</Badge>
        ) : null}
      </div>

      {error ? (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Friend Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingIncoming.map((request) => (
            <div key={request.id} className="rounded-lg border bg-white p-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  {request.requesterAvatarUrl ? (
                    <img
                      src={request.requesterAvatarUrl}
                      alt={request.requesterName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>{request.requesterName.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{request.requesterName}</p>
                  <p className="text-sm text-zinc-600">sent you a follow request</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyRequestId === request.id}
                    onClick={() => {
                      void handleDecision(request, 'accepted');
                    }}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyRequestId === request.id}
                    onClick={() => {
                      void handleDecision(request, 'declined');
                    }}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {pendingIncoming.length === 0 ? (
            <p className="text-sm text-zinc-500">No pending friend requests.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {outgoingRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
              <div>
                <p className="font-semibold">{request.targetName}</p>
                <p className="text-sm text-zinc-600">Follow request sent</p>
              </div>
              <Badge
                className={
                  request.status === 'accepted'
                    ? 'bg-green-600 text-white'
                    : request.status === 'declined'
                      ? 'bg-zinc-200 text-zinc-700'
                      : 'bg-amber-200 text-amber-900'
                }
              >
                {request.status}
              </Badge>
            </div>
          ))}
          {outgoingRequests.length === 0 ? (
            <p className="text-sm text-zinc-500">No sent requests yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
