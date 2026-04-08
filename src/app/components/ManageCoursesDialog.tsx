import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Users, UserPlus, Search } from 'lucide-react';
import { type Major, type Year } from '@/app/lib/courseCatalog';
import { getCoursesForTerm } from '@/app/lib/coursesService';

type Semester = '1' | '2';

interface CourseRoles {
  [course: string]: 'mentor' | 'mentee';
}

interface ManageCoursesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCourses: CourseRoles;
  onSave: (newCourses: CourseRoles) => void | Promise<void>;
}

export function ManageCoursesDialog({ open, onOpenChange, currentCourses, onSave }: ManageCoursesDialogProps) {
  const [major, setMajor] = useState<Major>((localStorage.getItem('major') as Major) || 'BSIT');
  const [year, setYear] = useState<Year>((localStorage.getItem('yearLevel') as Year) || '1');
  const [semester, setSemester] = useState<Semester>((localStorage.getItem('semester') as Semester) || '1');
  const [tempCourses, setTempCourses] = useState<CourseRoles>(currentCourses);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    let active = true;
    void getCoursesForTerm(major, year, Number(semester) as 1 | 2).then((items) => {
      if (active) {
        setAvailableCourses(items);
      }
    });

    return () => {
      active = false;
    };
  }, [major, year, semester]);

  const toggleCourseRole = (course: string, role: 'mentor' | 'mentee') => {
    setTempCourses((prev) => {
      if (prev[course] === role) {
        // Deselect
        const newRoles = { ...prev };
        delete newRoles[course];
        return newRoles;
      }
      // Add or switch
      return { ...prev, [course]: role };
    });
  };

  const handleSave = async () => {
    try {
      await Promise.resolve(onSave(tempCourses));
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save courses', error);
    }
  };

  const handleCancel = () => {
    setTempCourses(currentCourses);
    onOpenChange(false);
  };

  const normalizedSearch = courseSearch.trim().toLowerCase();
  const selectedCourses = availableCourses.filter((course) => Boolean(tempCourses[course]));
  const unselectedCourses = availableCourses.filter((course) => !tempCourses[course]);
  const filteredSelectedCourses = selectedCourses.filter((course) =>
    course.toLowerCase().includes(normalizedSearch),
  );
  const filteredUnselectedCourses = unselectedCourses.filter((course) =>
    course.toLowerCase().includes(normalizedSearch),
  );
  const totalVisibleCourses = filteredSelectedCourses.length + filteredUnselectedCourses.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Manage Your Courses</DialogTitle>
          <DialogDescription>
            Add or remove courses and update your mentor/mentee roles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filters */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Major</Label>
              <Select value={major} onValueChange={(value: string) => setMajor(value as Major)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BSIT">BSIT</SelectItem>
                  <SelectItem value="BSCS">BSCS</SelectItem>
                  <SelectItem value="BSIS">BSIS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={(value: string) => setYear(value as Year)}>
                <SelectTrigger>
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
              <Label>Semester</Label>
              <Select value={semester} onValueChange={(value: string) => setSemester(value as Semester)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Courses List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Available Courses</h4>
              <Badge variant="outline">
                {Object.keys(tempCourses).length} selected
              </Badge>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={courseSearch}
                  onChange={(event) => setCourseSearch(event.target.value)}
                  placeholder="Search courses"
                  className="pl-9"
                />
              </div>
              <div className="mt-2 text-xs text-zinc-600">
                Showing {totalVisibleCourses} of {availableCourses.length} courses
              </div>
            </div>

            {availableCourses.length > 0 && totalVisibleCourses > 0 ? (
              <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                {filteredSelectedCourses.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Selected Courses ({filteredSelectedCourses.length})
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredSelectedCourses.map((course) => (
                        <div
                          key={course}
                          className="rounded-lg border-2 border-green-300 bg-green-50 p-3 transition-all"
                        >
                          <h5 className="line-clamp-2 min-h-10 font-medium text-sm">{course}</h5>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => toggleCourseRole(course, 'mentee')}
                              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                                tempCourses[course] === 'mentee'
                                  ? 'bg-green-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                              }`}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Mentee
                            </button>
                            <button
                              onClick={() => toggleCourseRole(course, 'mentor')}
                              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                                tempCourses[course] === 'mentor'
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                              }`}
                            >
                              <Users className="h-3.5 w-3.5" />
                              Mentor
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredUnselectedCourses.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Available Courses ({filteredUnselectedCourses.length})
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredUnselectedCourses.map((course) => (
                        <div
                          key={course}
                          className="rounded-lg border border-gray-200 bg-white p-3 transition-all"
                        >
                          <h5 className="line-clamp-2 min-h-10 font-medium text-sm">{course}</h5>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => toggleCourseRole(course, 'mentee')}
                              className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-gray-200"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Mentee
                            </button>
                            <button
                              onClick={() => toggleCourseRole(course, 'mentor')}
                              className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-gray-200"
                            >
                              <Users className="h-3.5 w-3.5" />
                              Mentor
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                {availableCourses.length > 0
                  ? 'No courses match your search'
                  : 'No courses available for this selection'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
