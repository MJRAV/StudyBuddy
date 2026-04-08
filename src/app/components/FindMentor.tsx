import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Search, Star, MessageCircle, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { getCurrentUserId } from '@/app/lib/authService';
import {
  sendFriendRequest,
  subscribeBuddies,
  subscribeIncomingFriendRequests,
  subscribeMentors,
  subscribeOutgoingFriendRequests,
  type MentorProfile,
} from '@/app/lib/socialService';

export function FindMentor() {
  const userId = getCurrentUserId();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [requestedIds, setRequestedIds] = useState<Record<string, boolean>>({});
  const [connectedIds, setConnectedIds] = useState<Record<string, boolean>>({});
  const selectedCourses = JSON.parse(localStorage.getItem('selectedCourses') || '[]');

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe = subscribeMentors(userId, setMentors);
    const unsubscribeBuddies = subscribeBuddies(userId, (items) => {
      setConnectedIds((prev) => {
        const next: Record<string, boolean> = {};
        items.forEach((item) => {
          next[item.uid] = true;
        });

        Object.keys(requestedIds).forEach((id) => {
          next[id] = next[id] || requestedIds[id];
        });

        return next;
      });
    });
    const unsubscribeOutgoing = subscribeOutgoingFriendRequests(userId, (items) => {
      setConnectedIds((prev) => {
        const next = { ...prev };
        items
          .filter((item) => item.status === 'pending')
          .forEach((item) => {
            next[item.targetId] = true;
          });
        return next;
      });
    });
    const unsubscribeIncoming = subscribeIncomingFriendRequests(userId, (items) => {
      setConnectedIds((prev) => {
        const next = { ...prev };
        items
          .filter((item) => item.status === 'pending')
          .forEach((item) => {
            next[item.requesterId] = true;
          });
        return next;
      });
    });
    return () => {
      unsubscribe?.();
      unsubscribeBuddies?.();
      unsubscribeOutgoing?.();
      unsubscribeIncoming?.();
    };
  }, [userId]);

  const filteredMentors = mentors.filter((mentor) => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || mentor.courses.includes(selectedCourse);
    const isConnected = connectedIds[mentor.uid] || requestedIds[mentor.uid];
    return matchesSearch && matchesCourse && !isConnected;
  });

  return (
    <div className="mx-auto max-w-4xl p-4 min-h-screen bg-amber-50">
      <h1 className="mb-6 text-2xl font-bold">Find a Mentor</h1>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {selectedCourses.map((course: string) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredMentors.map((mentor) => (
          <Card key={mentor.uid}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {mentor.avatarUrl ? (
                    <img
                      src={mentor.avatarUrl}
                      alt={mentor.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>{mentor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{mentor.name}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{mentor.major || 'Mentor'}</span>
                      </div>
                    </div>
                    <Badge className="bg-green-500 text-white">Available</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-zinc-600">{mentor.bio}</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {mentor.courses.map((course) => (
                  <Badge key={course} variant="outline">
                    {course}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={requestedIds[mentor.uid]}
                  onClick={() => {
                    if (!userId) {
                      return;
                    }

                    const requesterName = localStorage.getItem('userName') || 'User';
                    void sendFriendRequest(userId, {
                      targetUserId: mentor.uid,
                      requesterName,
                      targetName: mentor.name,
                    }).then(() => {
                      setRequestedIds((prev) => ({ ...prev, [mentor.uid]: true }));
                    });
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {requestedIds[mentor.uid] ? 'Request Sent' : 'Send Request'}
                </Button>
                <Button variant="outline">View Profile</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMentors.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-zinc-500">No mentors found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
