import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Search, MessageCircle, UserMinus, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

const mockBuddies = [
  {
    id: 1,
    name: 'Mike Chen',
    role: 'Mentee',
    courses: ['Web Development', 'Database Systems'],
    status: 'online',
    lastActive: 'Active now',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    role: 'Mentor',
    courses: ['Data Structures', 'Algorithms'],
    status: 'online',
    lastActive: 'Active now',
  },
  {
    id: 3,
    name: 'Emma Davis',
    role: 'Mentor',
    courses: ['Machine Learning', 'AI'],
    status: 'offline',
    lastActive: '2 hours ago',
  },
  {
    id: 4,
    name: 'John Smith',
    role: 'Mentee',
    courses: ['Mobile Development', 'React Native'],
    status: 'offline',
    lastActive: '1 day ago',
  },
];

const mockStudyGroups = [
  {
    id: 1,
    name: 'Data Structures Study Group',
    members: 8,
    course: 'Data Structures',
    nextSession: 'Tomorrow at 3 PM',
  },
  {
    id: 2,
    name: 'Web Dev Bootcamp',
    members: 12,
    course: 'Web Development',
    nextSession: 'Friday at 5 PM',
  },
  {
    id: 3,
    name: 'ML Enthusiasts',
    members: 6,
    course: 'Machine Learning',
    nextSession: 'Next Monday at 2 PM',
  },
];

export function BuddyPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuddies = mockBuddies.filter((buddy) =>
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
              <Card key={buddy.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{buddy.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      {buddy.status === 'online' && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{buddy.name}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge className={buddy.role === 'Mentor' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}>
                              {buddy.role}
                            </Badge>
                            <span className="text-xs text-zinc-500">{buddy.lastActive}</span>
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
                        <Button size="sm" variant="outline">
                          <MessageCircle className="mr-2 h-3 w-3" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline">
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
                <Button className="mt-4" onClick={() => window.location.href = '/app/find-mentor'}>
                  Find Study Partners
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups">
          <div className="space-y-4">
            {mockStudyGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <p className="text-sm text-zinc-600">{group.members} members</p>
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
                    <Button size="sm" variant="outline">Leave Group</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-4">
            <CardContent className="py-8 text-center">
              <h3 className="font-semibold mb-2">Create Your Own Study Group</h3>
              <p className="text-sm text-zinc-600 mb-4">
                Start a new study group and invite your buddies
              </p>
              <Button>Create Group</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
