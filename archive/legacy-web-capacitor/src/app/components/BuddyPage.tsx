import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Search, MessageCircle, UserMinus, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { getCurrentUserId } from '@/app/lib/authService';
import {
  createStudyGroup,
  removeBuddy,
  subscribeBuddies,
  subscribeStudyGroups,
  type Buddy,
  type StudyGroup,
} from '@/app/lib/socialService';

export function BuddyPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const [searchQuery, setSearchQuery] = useState('');
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCourse, setNewGroupCourse] = useState('General');

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubBuddies = subscribeBuddies(userId, setBuddies);
    const unsubGroups = subscribeStudyGroups(userId, setGroups);

    return () => {
      unsubBuddies?.();
      unsubGroups?.();
    };
  }, [userId]);

  const filteredBuddies = buddies.filter((buddy) =>
    buddy.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl p-4 min-h-screen bg-amber-50">
      <h1 className="mb-6 text-2xl font-bold">My Buddies</h1>

      <Tabs defaultValue="buddies">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="buddies" className="flex-1">Buddies</TabsTrigger>
          <TabsTrigger value="groups" className="flex-1">Study Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="buddies">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search buddies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredBuddies.map((buddy) => (
              <Card key={buddy.uid}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        {buddy.avatarUrl ? (
                          <img
                            src={buddy.avatarUrl}
                            alt={buddy.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <AvatarFallback>{buddy.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{buddy.name}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge className={buddy.role === 'Mentor' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}>
                              {buddy.role}
                            </Badge>
                            <span className="text-xs text-zinc-500">Connected</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {buddy.courses.map((course) => (
                          <Badge key={course} variant="outline" className="text-xs">
                            {course}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/app/messages')}
                        >
                          <MessageCircle className="mr-2 h-3 w-3" />
                          Message
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!userId) {
                              return;
                            }

                            void removeBuddy(userId, buddy.uid);
                          }}
                        >
                          <UserMinus className="mr-2 h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredBuddies.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-zinc-500">No buddies found</p>
                <Button className="mt-4" onClick={() => navigate('/app/find-mentor')}>
                  Find Study Partners
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups">
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <p className="text-sm text-zinc-600">{group.memberCount} members</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">{group.course}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>Next session: {group.nextSession}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">View Group</Button>
                    <Button size="sm" variant="outline" disabled>Leave Group</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {groups.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-zinc-500">No study groups yet.</CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="mt-4">
            <CardContent className="py-8 text-center">
              <h3 className="font-semibold mb-2">Create Your Own Study Group</h3>
              <p className="text-sm text-zinc-600 mb-4">
                Start a new study group and invite your buddies
              </p>
              <div className="mx-auto mb-3 flex max-w-md gap-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                />
                <Input
                  value={newGroupCourse}
                  onChange={(e) => setNewGroupCourse(e.target.value)}
                  placeholder="Course"
                />
              </div>
              <Button
                disabled={!newGroupName.trim() || !userId}
                onClick={() => {
                  if (!userId || !newGroupName.trim()) {
                    return;
                  }

                  void createStudyGroup(userId, {
                    name: newGroupName.trim(),
                    course: newGroupCourse.trim() || 'General',
                  });
                  setNewGroupName('');
                }}
              >
                Create Group
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
