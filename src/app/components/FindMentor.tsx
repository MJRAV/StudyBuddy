import { useState } from 'react';
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

const mockMentors = [
  {
    id: 1,
    name: 'Sarah Johnson',
    courses: ['Data Structures', 'Algorithms', 'Web Development'],
    rating: 4.8,
    students: 23,
    bio: 'Computer Science graduate with 5 years of teaching experience. Passionate about helping students understand complex concepts.',
    availability: 'Available',
  },
  {
    id: 2,
    name: 'Emma Davis',
    courses: ['Machine Learning', 'Artificial Intelligence', 'Python'],
    rating: 4.9,
    students: 31,
    bio: 'ML Engineer at a Fortune 500 company. Love sharing practical insights from industry.',
    availability: 'Available',
  },
  {
    id: 3,
    name: 'David Lee',
    courses: ['Database Systems', 'Cloud Computing', 'DevOps'],
    rating: 4.7,
    students: 18,
    bio: 'Backend developer with expertise in scalable systems. Happy to help with databases and cloud.',
    availability: 'Busy',
  },
  {
    id: 4,
    name: 'Rachel Kim',
    courses: ['Mobile Development', 'UI/UX Design', 'React Native'],
    rating: 4.8,
    students: 27,
    bio: 'Mobile app developer and designer. Focus on creating beautiful and functional apps.',
    availability: 'Available',
  },
];

export function FindMentor() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const selectedCourses = JSON.parse(localStorage.getItem('selectedCourses') || '[]');

  const filteredMentors = mockMentors.filter((mentor) => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || mentor.courses.includes(selectedCourse);
    return matchesSearch && matchesCourse;
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
          <Card key={mentor.id}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>{mentor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{mentor.name}</h3>
                      <div className="mt-1 flex items-center gap-3 text-sm text-zinc-600">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{mentor.rating}</span>
                        </div>
                        <span>•</span>
                        <span>{mentor.students} students</span>
                      </div>
                    </div>
                    <Badge className={mentor.availability === 'Available' ? 'bg-green-500 text-white' : 'bg-zinc-200 text-zinc-700'}>
                      {mentor.availability}
                    </Badge>
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
                <Button className="flex-1">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message
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
