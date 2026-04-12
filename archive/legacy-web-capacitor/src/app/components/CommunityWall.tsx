import { useEffect, useState } from 'react';
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
import { isFirebaseConfigured, supabase } from '@/app/lib/firebase';
import { getCurrentUserId } from '@/app/lib/authService';

type CommunityComment = {
  id: string;
  avatarUrl: string;
  author: string;
  content: string;
  createdAt: string;
  isMine: boolean;
};

type CommunityPost = {
  id: string;
  avatarUrl: string;
  author: string;
  role: string;
  course: string;
  content: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: CommunityComment[];
};

export function CommunityWall() {
  const userId = getCurrentUserId();
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const selectedCourses = JSON.parse(localStorage.getItem('selectedCourses') || '[]');

  useEffect(() => {
    if (!isFirebaseConfigured || !supabase || !userId) {
      return;
    }
    const client = supabase;

    let active = true;

    const fetch = async () => {
      const [postsResp, likesResp, commentsResp] = await Promise.all([
        client
        .from('community_posts')
        .select('id,author_id,author_name,author_role,course,content')
        .order('created_at', { ascending: false }),
        client
          .from('community_post_likes')
          .select('post_id,user_id'),
        client
          .from('community_post_comments')
          .select('id,post_id,author_id,author_name,content,created_at')
          .order('created_at', { ascending: true }),
      ]);

      if (!active || postsResp.error || likesResp.error || commentsResp.error) {
        return;
      }

      const authorIds = Array.from(new Set([
        ...(postsResp.data ?? []).map((item) => String(item.author_id ?? '')).filter(Boolean),
        ...(commentsResp.data ?? []).map((item) => String(item.author_id ?? '')).filter(Boolean),
      ]));
      const { data: avatarRows } = authorIds.length
        ? await client.from('users').select('uid,avatar_url').in('uid', authorIds)
        : { data: [] as Array<{ uid?: unknown; avatar_url?: unknown }> };

      const avatarByUid = new Map(
        (avatarRows ?? []).map((item) => [String(item.uid ?? ''), String(item.avatar_url ?? '')]),
      );

      const likesByPost = new Map<string, Set<string>>();
      (likesResp.data ?? []).forEach((item) => {
        const postId = String(item.post_id ?? '');
        const likerId = String(item.user_id ?? '');
        if (!postId || !likerId) {
          return;
        }

        if (!likesByPost.has(postId)) {
          likesByPost.set(postId, new Set());
        }
        likesByPost.get(postId)?.add(likerId);
      });

      const commentsByPost = new Map<string, CommunityComment[]>();
      (commentsResp.data ?? []).forEach((item) => {
        const postId = String(item.post_id ?? '');
        if (!postId) {
          return;
        }

        const authorId = String(item.author_id ?? '');
        const comment: CommunityComment = {
          id: String(item.id),
          avatarUrl: avatarByUid.get(authorId) ?? '',
          author: String(item.author_name ?? 'User'),
          content: String(item.content ?? ''),
          createdAt: String(item.created_at ?? ''),
          isMine: authorId === userId,
        };

        const current = commentsByPost.get(postId) ?? [];
        current.push(comment);
        commentsByPost.set(postId, current);
      });

      const rows: CommunityPost[] = (postsResp.data ?? []).map((item) => {
        const postId = String(item.id);
        const likedByMe = Boolean(userId && likesByPost.get(postId)?.has(userId));

        return {
          id: postId,
          avatarUrl: avatarByUid.get(String(item.author_id ?? '')) ?? '',
          author: String(item.author_name ?? 'Unknown User'),
          role: String(item.author_role ?? 'Member'),
          course: String(item.course ?? 'General'),
          content: String(item.content ?? ''),
          likeCount: likesByPost.get(postId)?.size ?? 0,
          commentCount: commentsByPost.get(postId)?.length ?? 0,
          likedByMe,
          comments: commentsByPost.get(postId) ?? [],
        };
      });

      setPosts(rows);
    };

    void fetch();
    const interval = window.setInterval(() => {
      void fetch();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [userId, refreshKey]);

  const handlePost = async () => {
    if (!newPost.trim() || !supabase || !userId) {
      return;
    }
    const client = supabase;

    const authorName = localStorage.getItem('userName') || 'User';
    const authorRole = localStorage.getItem('userRole') || 'member';
    const course = selectedCourse === 'all' ? (selectedCourses[0] || 'General') : selectedCourse;

    const { error } = await client.from('community_posts').insert({
      author_id: userId,
      author_name: authorName,
      author_role: authorRole,
      course,
      content: newPost.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return;
    }

    setNewPost('');
    setRefreshKey((value) => value + 1);
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!supabase || !userId) {
      return;
    }

    const client = supabase;
    const { error } = post.likedByMe
      ? await client.from('community_post_likes').delete().eq('post_id', post.id).eq('user_id', userId)
      : await client.from('community_post_likes').insert({
          post_id: post.id,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

    if (error) {
      return;
    }

    setRefreshKey((value) => value + 1);
  };

  const handleComment = async (post: CommunityPost) => {
    if (!supabase || !userId) {
      return;
    }

    const content = commentDrafts[post.id]?.trim();
    if (!content) {
      return;
    }

    const client = supabase;
    const authorName = localStorage.getItem('userName') || 'User';

    const { error } = await client.from('community_post_comments').insert({
      post_id: post.id,
      author_id: userId,
      author_name: authorName,
      content,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return;
    }

    setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
    setOpenComments((prev) => ({ ...prev, [post.id]: true }));
    setRefreshKey((value) => value + 1);
  };

  const visiblePosts = selectedCourse === 'all'
    ? posts
    : posts.filter((post) => post.course === selectedCourse);

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
        {visiblePosts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Avatar>
                  {post.avatarUrl ? (
                    <img
                      src={post.avatarUrl}
                      alt={post.author}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>{post.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{post.author}</h3>
                    <Badge className={post.role === 'Mentor' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}>
                      {post.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-600">{post.course}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{post.content}</p>
              <div className="flex items-center gap-6 text-sm text-zinc-600">
                <button className="flex items-center gap-2" onClick={() => void toggleLike(post)}>
                  <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{post.likeCount}</span>
                </button>
                <button className="flex items-center gap-2" onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}>
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.commentCount}</span>
                </button>
                <button className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
              {openComments[post.id] ? (
                <div className="mt-4 space-y-3 border-t pt-4">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        {comment.avatarUrl ? (
                          <img
                            src={comment.avatarUrl}
                            alt={comment.author}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-xs">{comment.author.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="rounded-lg bg-zinc-50 px-3 py-2">
                        <p className="text-sm font-medium">{comment.author}</p>
                        <p className="text-sm text-zinc-700">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Textarea
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Write a comment..."
                      rows={2}
                    />
                    <Button onClick={() => void handleComment(post)} disabled={!commentDrafts[post.id]?.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {visiblePosts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-zinc-500">No community posts yet.</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
