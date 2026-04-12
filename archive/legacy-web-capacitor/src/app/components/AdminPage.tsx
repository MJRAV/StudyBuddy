import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShieldCheck, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { isFirebaseConfigured, supabase } from '@/app/lib/firebase';
import { getCurrentUserId } from '@/app/lib/authService';
import { type Major, type Year } from '@/app/lib/courseCatalog';

type AdminCourse = {
  id: string;
  name: string;
  major: string;
  yearLevel: string;
  semester: string;
};

type AdminLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  details: Record<string, unknown>;
};

type AdminStats = {
  users: number;
  courses: number;
  posts: number;
  requests: number;
};

type Semester = '1' | '2';
type SupabaseStatus = 'connected' | 'checking' | 'disconnected';
type PendingAction =
  | {
      type: 'add';
      payload: {
        name: string;
        major: Major;
        year: Year;
        semester: Semester;
      };
    }
  | {
      type: 'delete';
      course: AdminCourse;
    }
  | null;

export function AdminPage() {
  const navigate = useNavigate();
  const uid = getCurrentUserId();

  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats>({ users: 0, courses: 0, posts: 0, requests: 0 });
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);

  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseMajor, setNewCourseMajor] = useState<Major>('BSIT');
  const [newCourseYear, setNewCourseYear] = useState<Year>('1');
  const [newCourseSemester, setNewCourseSemester] = useState<Semester>('1');
  const [courseSearch, setCourseSearch] = useState('');
  const [filterMajor, setFilterMajor] = useState<Major | 'all'>('all');
  const [filterYear, setFilterYear] = useState<Year | 'all'>('all');
  const [filterSemester, setFilterSemester] = useState<Semester | 'all'>('all');

  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [error, setError] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>(
    isFirebaseConfigured && supabase ? 'checking' : 'disconnected',
  );
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !supabase || !uid) {
      setSupabaseStatus('disconnected');
      return;
    }
    const client = supabase;

    let active = true;

    const load = async () => {
      try {
        setSupabaseStatus('checking');
        const [profileResp, usersResp, coursesResp, postsResp, requestsResp, logsResp] = await Promise.all([
          client.from('users').select('uid,is_admin').eq('uid', uid).maybeSingle(),
          client.from('users').select('uid', { count: 'exact', head: true }),
          client.from('courses').select('id,name,major,year_level,semester', { count: 'exact' }).order('major', { ascending: true }).order('year_level', { ascending: true }).order('semester', { ascending: true }).order('name', { ascending: true }),
          client
            .from('community_posts')
            .select('id', { count: 'exact', head: true }),
          client
            .from('friend_requests')
            .select('id', { count: 'exact', head: true }),
          client
            .from('admin_activity_logs')
            .select('id,action,target_type,target_id,details,created_at')
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        if (!active) {
          return;
        }

        setSupabaseStatus('connected');

        if (profileResp.error) {
          setError(profileResp.error.message);
          return;
        }

        const currentUser = profileResp.data as { uid?: unknown; is_admin?: unknown } | null;
        const hasAdminAccess = Boolean(currentUser?.is_admin);
        setIsAdmin(hasAdminAccess);

        if (!hasAdminAccess) {
          setError('This account does not have admin access. Ask an existing admin to set users.is_admin = true for your account.');
          return;
        }

        setStats({
          users: usersResp.count ?? 0,
          courses: coursesResp.count ?? 0,
          posts: postsResp.count ?? 0,
          requests: requestsResp.count ?? 0,
        });

        setCourses(
          (coursesResp.data ?? []).map((row) => ({
            id: String(row.id ?? ''),
            name: String(row.name ?? ''),
            major: String(row.major ?? ''),
            yearLevel: String(row.year_level ?? ''),
            semester: String(row.semester ?? ''),
          })),
        );

        setLogs(
          (logsResp.data ?? []).map((row) => ({
            id: String(row.id ?? ''),
            action: String(row.action ?? ''),
            targetType: String(row.target_type ?? ''),
            targetId: String(row.target_id ?? ''),
            createdAt: String(row.created_at ?? ''),
            details: (row.details as Record<string, unknown>) ?? {},
          })),
        );
      } catch {
        if (active) {
          setSupabaseStatus('disconnected');
          setError('Unable to reach Supabase right now. Check network and project settings.');
        }
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [uid]);

  const handleAddCourse = () => {
    const name = newCourseName.trim();
    if (!name) {
      return;
    }

    setPendingAction({
      type: 'add',
      payload: {
        name,
        major: newCourseMajor,
        year: newCourseYear,
        semester: newCourseSemester,
      },
    });
    setIsConfirmOpen(true);
  };

  const executeAddCourse = async (payload: { name: string; major: Major; year: Year; semester: Semester }) => {
    if (!supabase || !uid || !payload.name.trim()) {
      return;
    }

    try {
      setIsSavingCourse(true);
      setError('');
      const client = supabase;

      const { data, error: insertError } = await client
        .from('courses')
        .insert({
          name: payload.name.trim(),
          major: payload.major,
          year_level: payload.year,
          semester: payload.semester,
          created_at: new Date().toISOString(),
        })
        .select('id,name,major,year_level,semester')
        .single();

      if (insertError) {
        throw insertError;
      }

      const newCourse: AdminCourse = {
        id: String(data.id),
        name: String(data.name),
        major: String(data.major),
        yearLevel: String(data.year_level),
        semester: String(data.semester),
      };

      setCourses((prev) => [...prev, newCourse].sort((a, b) => {
        const aKey = `${a.major}-${a.yearLevel}-${a.semester}-${a.name}`;
        const bKey = `${b.major}-${b.yearLevel}-${b.semester}-${b.name}`;
        return aKey.localeCompare(bKey);
      }));
      setStats((prev) => ({ ...prev, courses: prev.courses + 1 }));

      await client.from('admin_activity_logs').insert({
        admin_uid: uid,
        action: 'course_created',
        target_type: 'course',
        target_id: newCourse.id,
        details: {
          name: newCourse.name,
          major: newCourse.major,
          yearLevel: newCourse.yearLevel,
          semester: newCourse.semester,
        },
      });

      setLogs((prev) => [
        {
          id: `local-${Date.now()}`,
          action: 'course_created',
          targetType: 'course',
          targetId: newCourse.id,
          createdAt: new Date().toISOString(),
          details: {
            name: newCourse.name,
            major: newCourse.major,
            yearLevel: newCourse.yearLevel,
            semester: newCourse.semester,
          },
        },
        ...prev,
      ].slice(0, 50));

      setNewCourseName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add course.';
      setError(message);
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleDeleteCourse = (course: AdminCourse) => {
    setPendingAction({ type: 'delete', course });
    setIsConfirmOpen(true);
  };

  const executeDeleteCourse = async (course: AdminCourse) => {
    if (!supabase || !uid) {
      return;
    }

    try {
      setError('');
      const client = supabase;
      const { error: deleteError } = await client.from('courses').delete().eq('id', course.id);
      if (deleteError) {
        throw deleteError;
      }

      setCourses((prev) => prev.filter((item) => item.id !== course.id));
      setStats((prev) => ({ ...prev, courses: Math.max(0, prev.courses - 1) }));

      await client.from('admin_activity_logs').insert({
        admin_uid: uid,
        action: 'course_deleted',
        target_type: 'course',
        target_id: course.id,
        details: {
          name: course.name,
          major: course.major,
          yearLevel: course.yearLevel,
          semester: course.semester,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete course.';
      setError(message);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    setIsConfirmOpen(false);
    setPendingAction(null);

    if (action.type === 'add') {
      await executeAddCourse(action.payload);
      return;
    }

    await executeDeleteCourse(action.course);
  };

  const statusText = useMemo(() => {
    if (!isFirebaseConfigured) {
      return 'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env.';
    }

    if (!uid) {
      return 'No authenticated user. Log in first to view account data.';
    }

    if (!isAdmin) {
      return 'Admin access required.';
    }

    return '';
  }, [uid, isAdmin]);

  const supabaseStatusLabel = useMemo(() => {
    if (!isFirebaseConfigured || !supabase) {
      return 'Supabase: Not configured';
    }
    if (supabaseStatus === 'checking') {
      return 'Supabase: Checking...';
    }
    if (supabaseStatus === 'connected') {
      return 'Supabase: Connected';
    }
    return 'Supabase: Disconnected';
  }, [supabaseStatus]);

  const supabaseStatusClass = useMemo(() => {
    if (!isFirebaseConfigured || !supabase) {
      return 'border-zinc-300 bg-zinc-100 text-zinc-700';
    }
    if (supabaseStatus === 'checking') {
      return 'border-amber-300 bg-amber-100 text-amber-800';
    }
    if (supabaseStatus === 'connected') {
      return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    }
    return 'border-red-300 bg-red-100 text-red-800';
  }, [supabaseStatus]);

  const filteredCourses = useMemo(() => {
    const searchTerm = courseSearch.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch = !searchTerm || course.name.toLowerCase().includes(searchTerm);
      const matchesMajor = filterMajor === 'all' || course.major === filterMajor;
      const matchesYear = filterYear === 'all' || course.yearLevel === filterYear;
      const matchesSemester = filterSemester === 'all' || course.semester === filterSemester;
      return matchesSearch && matchesMajor && matchesYear && matchesSemester;
    });
  }, [courses, courseSearch, filterMajor, filterYear, filterSemester]);

  const groupedCourses = useMemo(() => {
    const groups = new Map<string, AdminCourse[]>();
    filteredCourses.forEach((course) => {
      const key = `${course.major} · Year ${course.yearLevel} · Sem ${course.semester}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(course);
      } else {
        groups.set(key, [course]);
      }
    });

    return Array.from(groups.entries());
  }, [filteredCourses]);

  return (
    <div className="min-h-screen bg-amber-50 p-4 pb-24">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/app/profile')}
            className="flex items-center gap-2 text-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Profile</span>
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={supabaseStatusClass}>{supabaseStatusLabel}</Badge>
            <Badge className="bg-green-600 text-white">Admin Panel</Badge>
          </div>
        </div>

        {statusText ? (
          <Card>
            <CardContent className="pt-6 text-sm text-zinc-700">{statusText}</CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        {isAdmin ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader><CardTitle className="text-sm">Users</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.users}</p></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Courses</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.courses}</p></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Posts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.posts}</p></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Requests</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.requests}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600" />Course Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Course Name</Label>
                    <Input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} placeholder="e.g., Software Testing" />
                  </div>
                  <div className="space-y-2">
                    <Label>Major</Label>
                    <Select value={newCourseMajor} onValueChange={(value) => setNewCourseMajor(value as Major)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BSIT">BSIT</SelectItem>
                        <SelectItem value="BSCS">BSCS</SelectItem>
                        <SelectItem value="BSIS">BSIS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={newCourseYear} onValueChange={(value) => setNewCourseYear(value as Year)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select value={newCourseSemester} onValueChange={(value) => setNewCourseSemester(value as Semester)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddCourse} disabled={!newCourseName.trim() || isSavingCourse} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      {isSavingCourse ? 'Adding...' : 'Add Course'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="rounded-lg border bg-zinc-50 p-3">
                    <div className="grid gap-2 md:grid-cols-4">
                      <div className="relative md:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                          value={courseSearch}
                          onChange={(event) => setCourseSearch(event.target.value)}
                          placeholder="Search courses"
                          className="pl-9"
                        />
                      </div>
                      <Select value={filterMajor} onValueChange={(value) => setFilterMajor(value as Major | 'all')}>
                        <SelectTrigger>
                          <SelectValue placeholder="All majors" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All majors</SelectItem>
                          <SelectItem value="BSIT">BSIT</SelectItem>
                          <SelectItem value="BSCS">BSCS</SelectItem>
                          <SelectItem value="BSIS">BSIS</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={filterYear} onValueChange={(value) => setFilterYear(value as Year | 'all')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All years</SelectItem>
                            <SelectItem value="1">Year 1</SelectItem>
                            <SelectItem value="2">Year 2</SelectItem>
                            <SelectItem value="3">Year 3</SelectItem>
                            <SelectItem value="4">Year 4</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={filterSemester} onValueChange={(value) => setFilterSemester(value as Semester | 'all')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All sem</SelectItem>
                            <SelectItem value="1">Sem 1</SelectItem>
                            <SelectItem value="2">Sem 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">Showing {filteredCourses.length} of {courses.length} courses</p>
                  </div>

                  {groupedCourses.length > 0 ? (
                    <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                      {groupedCourses.map(([group, groupCourses]) => (
                        <div key={group} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{group}</p>
                            <Badge variant="outline">{groupCourses.length}</Badge>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {groupCourses.map((course) => (
                              <div key={course.id} className="flex items-center justify-between rounded-md border bg-white p-3">
                                <div className="pr-3">
                                  <p className="font-medium leading-tight">{course.name}</p>
                                  <p className="text-xs text-zinc-500">{course.major} - Year {course.yearLevel} - Semester {course.semester}</p>
                                </div>
                                <Button variant="outline" onClick={() => void handleDeleteCourse(course)}>
                                  <Trash2 className="mr-2 h-4 w-4" />Delete
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No courses found for your current filters.</p>
                  )}
                  {courses.length === 0 ? <p className="text-sm text-zinc-500">No courses found.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{log.action}</p>
                      <p className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-zinc-600">target: {log.targetType}{log.targetId ? `/${log.targetId}` : ''}</p>
                  </div>
                ))}
                {logs.length === 0 ? <p className="text-sm text-zinc-500">No admin activity yet.</p> : null}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === 'add' ? 'Add Course?' : 'Delete Course?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'add'
                ? `This will add ${pendingAction.payload.name} (${pendingAction.payload.major} - Year ${pendingAction.payload.year} - Semester ${pendingAction.payload.semester}).`
                : pendingAction?.type === 'delete'
                  ? `This will remove ${pendingAction.course.name} (${pendingAction.course.major} - Year ${pendingAction.course.yearLevel} - Semester ${pendingAction.course.semester}).`
                  : 'Please confirm this action.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingAction(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmAction()}>
              {pendingAction?.type === 'add' ? 'Confirm Add' : 'Confirm Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
