import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Heart, MessageCircle, Share2, Send } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

const mockPosts = [
  {
    id: 1,
    author: 'Sarah Johnson',
    role: 'Mentor',
    course: 'Data Structures',
    content: 'Just finished reviewing trees and graphs! Happy to help anyone struggling with these concepts. Drop your questions below! 🌳',
    likes: 12,
    comments: 5,
    time: '2h ago',
  },
  {
    id: 2,
    author: 'Mike Chen',
    role: 'Mentee',
    course: 'Web Development',
    content: 'Looking for study buddies for the upcoming React exam. Anyone interested in forming a group?',
    likes: 8,
    comments: 3,
    time: '4h ago',
  },
  {
    id: 3,
    author: 'Emma Davis',
    role: 'Mentor',
    course: 'Machine Learning',
    content: 'Pro tip: When debugging your ML models, always check your data preprocessing first! I see this being overlooked so often.',
    likes: 25,
    comments: 7,
    time: '1d ago',
  },
];

export function CommunityWall() {
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [newPost, setNewPost] = useState('');
  const selectedCourses = JSON.parse(localStorage.getItem('selectedCourses') || '[]');

  const handlePost = () => {
    if (newPost.trim()) {
      // In production, this would save to database
      setNewPost('');
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 min-h-screen bg-amber-50">
      <div className="mb-6">
        <h1 className="mb-4 text-2xl font-bold">Community Wall</h1>
        
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="mb-4">
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

        <Card>
          <CardContent className="pt-6">
            <Textarea
              placeholder="Share your thoughts, ask questions..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="mb-2"
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={handlePost} disabled={!newPost.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {mockPosts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{post.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{post.author}</h3>
                    <Badge className={post.role === 'Mentor' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}>
                      {post.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-600">{post.course} • {post.time}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{post.content}</p>
              <div className="flex items-center gap-6 text-sm text-zinc-600">
                <button className="flex items-center gap-2 hover:text-red-500">
                  <Heart className="h-4 w-4" />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-green-600">
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-green-600">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
