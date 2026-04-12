import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { ArrowLeft, ArrowRight, GraduationCap, Calendar, BookOpen, Users, UserPlus, Search } from 'lucide-react';
import { getCurrentUserId } from '@/app/lib/authService';
import { manageUserCourses } from '@/app/lib/userService';
import { type Major, type Year, type Semester } from '@/app/lib/courseCatalog';
import { getCoursesForTerm } from '@/app/lib/coursesService';

interface CourseRoles {
  [course: string]: 'mentor' | 'mentee';
}

export function CourseSelection() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [major, setMajor] = useState<Major | null>(null);
  const [year, setYear] = useState<Year | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [courseRoles, setCourseRoles] = useState<CourseRoles>({});
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    if (step !== 4 || !major || !year || !semester) {
      setAvailableCourses([]);
      return;
    }

    let active = true;
    void getCoursesForTerm(major, year, semester).then((items) => {
      if (active) {
        setAvailableCourses(items);
      }
    });

    return () => {
      active = false;
    };
  }, [step, major, year, semester]);

  const toggleCourseRole = (course: string, role: 'mentor' | 'mentee') => {
    setCourseRoles((prev) => {
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

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    // Save data to localStorage
    localStorage.setItem('major', major || '');
    localStorage.setItem('yearLevel', year || '');
    localStorage.setItem('semester', semester?.toString() || '');
    localStorage.setItem('courseRoles', JSON.stringify(courseRoles));
    
    const selectedCourses = Object.keys(courseRoles);
    localStorage.setItem('selectedCourses', JSON.stringify(selectedCourses));

    const uid = getCurrentUserId();
    if (uid) {
      await manageUserCourses(uid, {
        courseRoles,
        major: major ?? '',
        yearLevel: year ?? '1',
        semester: semester?.toString() ?? '',
      });
    }
    
    navigate('/onboarding');
  };

  const canProceed = () => {
    if (step === 1) return major !== null;
    if (step === 2) return year !== null;
    if (step === 3) return semester !== null;
    if (step === 4) return Object.keys(courseRoles).length > 0;
    return false;
  };

  const courses = availableCourses;
  const normalizedSearch = courseSearch.trim().toLowerCase();
  const selectedCourses = courses.filter((course) => Boolean(courseRoles[course]));
  const unselectedCourses = courses.filter((course) => !courseRoles[course]);
  const filteredSelectedCourses = selectedCourses.filter((course) =>
    course.toLowerCase().includes(normalizedSearch),
  );
  const filteredUnselectedCourses = unselectedCourses.filter((course) =>
    course.toLowerCase().includes(normalizedSearch),
  );
  const totalVisibleCourses = filteredSelectedCourses.length + filteredUnselectedCourses.length;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-amber-50">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
            <Badge variant={step >= 1 ? 'default' : 'outline'} className="text-xs">{step > 1 ? '✓' : '1'}</Badge>
            <span className={step === 1 ? 'font-semibold' : ''}>Major</span>
            <span className="text-gray-400">→</span>
            <Badge variant={step >= 2 ? 'default' : 'outline'} className="text-xs">{step > 2 ? '✓' : '2'}</Badge>
            <span className={step === 2 ? 'font-semibold' : ''}>Year</span>
            <span className="text-gray-400">→</span>
            <Badge variant={step >= 3 ? 'default' : 'outline'} className="text-xs">{step > 3 ? '✓' : '3'}</Badge>
            <span className={step === 3 ? 'font-semibold' : ''}>Semester</span>
            <span className="text-gray-400">→</span>
            <Badge variant={step >= 4 ? 'default' : 'outline'} className="text-xs">4</Badge>
            <span className={step === 4 ? 'font-semibold' : ''}>Courses</span>
          </div>

          {step === 1 && (
            <>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-green-600" />
                <CardTitle className="text-2xl font-bold">What's your major?</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Select your degree program
              </CardDescription>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-green-600" />
                <CardTitle className="text-2xl font-bold">What year are you in?</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Select your current year level
              </CardDescription>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-green-600" />
                <CardTitle className="text-2xl font-bold">What semester?</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Are you in 1st or 2nd semester?
              </CardDescription>
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-green-600" />
                <CardTitle className="text-2xl font-bold">Select your courses</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Choose courses and your role for each (mentor or mentee)
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="px-6 pb-6">
          {/* Step 1: Major Selection */}
          {step === 1 && (
            <RadioGroup value={major || ''} onValueChange={(value) => setMajor(value as Major)}>
              <div className="space-y-3">
                {(['BSIT', 'BSCS', 'BSIS'] as Major[]).map((majorOption) => (
                  <div
                    key={majorOption}
                    className={`flex items-center space-x-3 rounded-lg border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
                      major === majorOption
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200'
                    }`}
                    onClick={() => setMajor(majorOption)}
                  >
                    <RadioGroupItem value={majorOption} id={majorOption} className="h-5 w-5" />
                    <Label htmlFor={majorOption} className="flex-1 cursor-pointer text-base font-semibold">
                      {majorOption === 'BSIT' && 'Bachelor of Science in Information Technology'}
                      {majorOption === 'BSCS' && 'Bachelor of Science in Computer Science'}
                      {majorOption === 'BSIS' && 'Bachelor of Science in Information Systems'}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {/* Step 2: Year Selection */}
          {step === 2 && (
            <RadioGroup value={year || ''} onValueChange={(value) => setYear(value as Year)}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(['1', '2', '3', '4'] as Year[]).map((yearOption) => (
                  <div
                    key={yearOption}
                    className={`flex flex-col items-center space-y-2 rounded-lg border-2 p-6 transition-all cursor-pointer hover:shadow-md ${
                      year === yearOption
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200'
                    }`}
                    onClick={() => setYear(yearOption)}
                  >
                    <RadioGroupItem value={yearOption} id={`year-${yearOption}`} className="h-5 w-5" />
                    <Label htmlFor={`year-${yearOption}`} className="cursor-pointer text-center">
                      <div className="text-2xl font-bold">{yearOption}</div>
                      <div className="text-xs text-zinc-600">Year {yearOption}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {/* Step 3: Semester Selection */}
          {step === 3 && (
            <RadioGroup value={semester?.toString() || ''} onValueChange={(value) => setSemester(parseInt(value) as Semester)}>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((semOption) => (
                  <div
                    key={semOption}
                    className={`flex flex-col items-center space-y-3 rounded-lg border-2 p-8 transition-all cursor-pointer hover:shadow-md ${
                      semester === semOption
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200'
                    }`}
                    onClick={() => setSemester(semOption as Semester)}
                  >
                    <RadioGroupItem value={semOption.toString()} id={`sem-${semOption}`} className="h-5 w-5" />
                    <Label htmlFor={`sem-${semOption}`} className="cursor-pointer text-center">
                      <div className="text-3xl font-bold">{semOption}</div>
                      <div className="text-base text-zinc-600">{semOption === 1 ? 'First' : 'Second'} Semester</div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {/* Step 4: Course Selection */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="rounded-lg bg-yellow-50 border-2 border-yellow-400 p-3 text-sm text-zinc-700">
                <strong className="text-yellow-600">Your selection:</strong> {major} - Year {year}, Semester {semester}
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
                  Showing {totalVisibleCourses} of {courses.length} courses
                </div>
              </div>
              
              {totalVisibleCourses > 0 ? (
                <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
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
                            <h4 className="line-clamp-2 min-h-10 font-semibold text-sm">{course}</h4>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => toggleCourseRole(course, 'mentee')}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                                  courseRoles[course] === 'mentee'
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
                                  courseRoles[course] === 'mentor'
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
                            <h4 className="line-clamp-2 min-h-10 font-semibold text-sm">{course}</h4>
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
                <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 py-6 text-center text-sm text-zinc-600">
                  No courses match your search.
                </p>
              )}

              <div className="text-sm text-zinc-600 mt-4">
                {Object.keys(courseRoles).length} {Object.keys(courseRoles).length === 1 ? 'course' : 'courses'} selected
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="h-11 px-5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < 4 ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="h-11 px-6 text-base">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={!canProceed()} className="h-11 px-6 text-base">
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
