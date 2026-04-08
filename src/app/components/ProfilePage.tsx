import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ArrowLeft, Edit2, Save, X, GraduationCap, BookOpen, User as UserIcon, LogOut } from 'lucide-react';
import { ManageCoursesDialog } from '@/app/components/ManageCoursesDialog';
import { getCurrentUserId, logoutUser } from '@/app/lib/authService';
import { getUserProfile, updateUserProfile, uploadProfilePicture } from '@/app/lib/userService';
import { subscribeBuddies } from '@/app/lib/socialService';

interface CourseRoles {
  [course: string]: 'mentor' | 'mentee';
}

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  yearLevel: string;
  major: string;
  courseRoles: CourseRoles;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isManagingCourses, setIsManagingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [buddyCount, setBuddyCount] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    avatarUrl: '',
    bio: '',
    yearLevel: '1',
    major: '',
    courseRoles: {},
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  useEffect(() => {
    const loadProfile = async () => {
      const uid = getCurrentUserId();
      if (uid) {
        const cloudProfile = await getUserProfile(uid);
        if (cloudProfile) {
          const mappedProfile = {
            name: cloudProfile.name || 'User',
            email: cloudProfile.email || 'user@example.com',
            avatarUrl: cloudProfile.avatarUrl || '',
            bio: cloudProfile.bio,
            yearLevel: cloudProfile.yearLevel || '1',
            major: cloudProfile.major,
            courseRoles: cloudProfile.courseRoles,
          };
          setProfile(mappedProfile);
          setEditedProfile(mappedProfile);
          return;
        }
      }

      const userName = localStorage.getItem('userName') || 'User';
      const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
      const courseRoles = JSON.parse(localStorage.getItem('courseRoles') || '{}');
      const savedProfile = localStorage.getItem('userProfile');

      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        setEditedProfile(parsedProfile);
        return;
      }

      const initialProfile = {
        name: userName,
        email: userEmail,
        bio: '',
        yearLevel: '1',
        major: '',
        avatarUrl: '',
        courseRoles,
      };
      setProfile(initialProfile);
      setEditedProfile(initialProfile);
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) {
      setBuddyCount(0);
      return;
    }

    const unsubscribe = subscribeBuddies(uid, (items) => {
      setBuddyCount(items.length);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');

    try {
      const uid = getCurrentUserId();
      if (uid) {
        await updateUserProfile(uid, {
          name: editedProfile.name,
          email: editedProfile.email,
          bio: editedProfile.bio,
          yearLevel: editedProfile.yearLevel,
          major: editedProfile.major,
        });
      }

      setProfile(editedProfile);
      localStorage.setItem('userProfile', JSON.stringify(editedProfile));
      localStorage.setItem('userName', editedProfile.name);
      localStorage.setItem('userEmail', editedProfile.email);
      localStorage.setItem('avatarUrl', editedProfile.avatarUrl);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile changes', error);
      setSaveError(error instanceof Error ? error.message : 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCourses = async (newCourses: CourseRoles) => {
    const selectedCourses = Object.keys(newCourses);

    const uid = getCurrentUserId();
    if (uid) {
      try {
        await updateUserProfile(uid, {
          courseRoles: newCourses,
          selectedCourses,
        });
        const updatedProfile = { ...profile, courseRoles: newCourses };
        setProfile(updatedProfile);
        setEditedProfile(updatedProfile);
        localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        localStorage.setItem('courseRoles', JSON.stringify(newCourses));
        localStorage.setItem('selectedCourses', JSON.stringify(selectedCourses));
      } catch (error) {
        console.error('Failed to save course changes', error);
        setSaveError(error instanceof Error ? error.message : 'Unable to save course changes.');
      }
      return;
    }

    const updatedProfile = { ...profile, courseRoles: newCourses };
    setProfile(updatedProfile);
    setEditedProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    localStorage.setItem('courseRoles', JSON.stringify(newCourses));
    localStorage.setItem('selectedCourses', JSON.stringify(selectedCourses));
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setEditedProfile({ ...editedProfile, avatarUrl: previewUrl });

    const uid = getCurrentUserId();
    if (!uid) {
      return;
    }

    try {
      const publicUrl = await uploadProfilePicture(uid, file);
      const nextProfile = { ...editedProfile, avatarUrl: publicUrl };
      setProfile(nextProfile);
      setEditedProfile(nextProfile);
      localStorage.setItem('userProfile', JSON.stringify(nextProfile));
    } catch {
      // Keep the preview even if upload fails; user can retry.
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logoutUser();

    // Clear all user data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('selectedCourses');
    localStorage.removeItem('courseRoles');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('avatarUrl');
    
    // Redirect to splash/login page
    navigate('/login');
  };

  const mentorCourses = Object.entries(profile.courseRoles).filter(([_, role]) => role === 'mentor');
  const menteeCourses = Object.entries(profile.courseRoles).filter(([_, role]) => role === 'mentee');

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/app/community')}
            className="flex items-center gap-2 text-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          <h1 className="font-semibold">Profile</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-green-600"
            >
              <Edit2 className="h-5 w-5" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="w-16" /> // Spacer for alignment
          )}
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24">
                  {(isEditing ? editedProfile.avatarUrl : profile.avatarUrl) ? (
                    <img
                      src={isEditing ? editedProfile.avatarUrl : profile.avatarUrl}
                      alt="Profile picture"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-green-100 text-green-600 text-2xl">
                      {getInitials(isEditing ? editedProfile.name : profile.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                {isEditing ? (
                  <div className="mt-3">
                    <Label htmlFor="avatar-upload" className="cursor-pointer text-sm font-medium text-green-600">
                      Change Photo
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                ) : null}
              </div>
              
              {isEditing ? (
                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={editedProfile.name}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, email: e.target.value })
                      }
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-1">{profile.name}</h2>
                  <p className="text-sm text-zinc-600 mb-3">{profile.email}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {buddyCount} {buddyCount === 1 ? 'Buddy' : 'Buddies'}
                    </Badge>
                    {mentorCourses.length > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                        Mentor in {mentorCourses.length} {mentorCourses.length === 1 ? 'course' : 'courses'}
                      </Badge>
                    )}
                    {menteeCourses.length > 0 && (
                      <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200">
                        Mentee in {menteeCourses.length} {menteeCourses.length === 1 ? 'course' : 'courses'}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {saveError ? (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-sm text-red-700">{saveError}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Bio Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="h-5 w-5 text-zinc-600" />
              <h3 className="font-semibold">About Me</h3>
            </div>
            {isEditing ? (
              <Textarea
                placeholder="Tell others about yourself, your interests, and your goals..."
                value={editedProfile.bio}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, bio: e.target.value })
                }
                className="min-h-32 resize-none"
              />
            ) : (
              <p className="text-sm text-zinc-700">
                {profile.bio || 'No bio added yet. Tap edit to add one!'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-zinc-600" />
              <h3 className="font-semibold">Academic Information</h3>
            </div>
            
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="yearLevel">Year Level</Label>
                    <Select
                      value={editedProfile.yearLevel}
                      onValueChange={(value) =>
                        setEditedProfile({ ...editedProfile, yearLevel: value })
                      }
                    >
                      <SelectTrigger id="yearLevel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="major">Major/Program</Label>
                    <Input
                      id="major"
                      placeholder="e.g., Computer Science"
                      value={editedProfile.major}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, major: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-zinc-600 mb-1">Year Level</p>
                    <p className="font-medium">Year {profile.yearLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 mb-1">Major/Program</p>
                    <p className="font-medium">{profile.major || 'Not specified'}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Courses by Role */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-zinc-600" />
              <h3 className="font-semibold">My Courses</h3>
            </div>
            
            {Object.keys(profile.courseRoles).length > 0 ? (
              <div className="space-y-4">
                {mentorCourses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-2">As Mentor</p>
                    <div className="flex flex-wrap gap-2">
                      {mentorCourses.map(([course]) => (
                        <Badge key={course} className="bg-green-100 text-green-700 border-green-300">
                          {course}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {menteeCourses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-2">As Mentee</p>
                    <div className="flex flex-wrap gap-2">
                      {menteeCourses.map(([course]) => (
                        <Badge key={course} className="bg-green-50 text-green-600 border-green-200">
                          {course}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No courses selected yet. Visit the course selection page to add courses.
              </p>
            )}
            
            {!isEditing && (
              <Button
                variant="link"
                onClick={() => setIsManagingCourses(true)}
                className="mt-3 px-0 text-green-600"
              >
                Manage Courses
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Logout Button */}
        {!isEditing && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <Button
                variant="outline"
                onClick={() => navigate('/app/admin')}
                className="mb-3 w-full"
              >
                Open Admin Data Viewer
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Actions */}
        {isEditing && (
          <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manage Courses Dialog */}
      <ManageCoursesDialog
        open={isManagingCourses}
        onOpenChange={setIsManagingCourses}
        currentCourses={profile.courseRoles}
        onSave={handleSaveCourses}
      />
    </div>
  );
}
