import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, ArrowRight, GraduationCap, Calendar, BookOpen, Users, UserPlus } from 'lucide-react';

// Course data organized by major, year, and semester
const coursesByMajor = {
  BSIT: {
    '1': {
      1: ['Introduction to Computing', 'Programming Fundamentals', 'Discrete Mathematics', 'Technical Writing'],
      2: ['Object-Oriented Programming', 'Data Structures', 'Computer Organization', 'Web Development I'],
    },
    '2': {
      1: ['Database Systems', 'Web Development II', 'Information Management', 'Systems Analysis'],
      2: ['Network Administration', 'Mobile Development', 'IT Project Management', 'Human-Computer Interaction'],
    },
    '3': {
      1: ['Web Application Development', 'Systems Integration', 'Cloud Computing', 'Capstone Project 1'],
      2: ['IT Infrastructure', 'Cybersecurity Fundamentals', 'DevOps Practices', 'Internship'],
    },
    '4': {
      1: ['Advanced Web Technologies', 'Enterprise Systems', 'IT Service Management', 'Capstone Project 2'],
      2: ['Emerging Technologies', 'IT Governance', 'Business Analytics', 'Practicum'],
    },
  },
  BSCS: {
    '1': {
      1: ['Introduction to Programming', 'Calculus I', 'Physics I', 'Discrete Structures'],
      2: ['Data Structures & Algorithms', 'Calculus II', 'Physics II', 'Digital Logic Design'],
    },
    '2': {
      1: ['Computer Architecture', 'Algorithm Analysis', 'Linear Algebra', 'Software Engineering I'],
      2: ['Operating Systems', 'Database Management', 'Probability & Statistics', 'Software Engineering II'],
    },
    '3': {
      1: ['Computer Networks', 'Artificial Intelligence', 'Theory of Computation', 'Programming Languages'],
      2: ['Machine Learning', 'Compiler Design', 'Computer Graphics', 'Research Methods'],
    },
    '4': {
      1: ['Advanced Algorithms', 'Distributed Systems', 'Thesis I', 'Elective I'],
      2: ['Parallel Computing', 'Advanced Machine Learning', 'Thesis II', 'Elective II'],
    },
  },
  BSIS: {
    '1': {
      1: ['Fundamentals of IS', 'Introduction to Programming', 'Business Mathematics', 'Accounting Fundamentals'],
      2: ['Systems Analysis & Design', 'Database Fundamentals', 'Business Statistics', 'Financial Management'],
    },
    '2': {
      1: ['Enterprise Architecture', 'Advanced Database', 'Business Process Management', 'Marketing Management'],
      2: ['Information Security', 'Web-Based Systems', 'Operations Management', 'Organizational Behavior'],
    },
    '3': {
      1: ['Business Intelligence', 'Systems Audit', 'Strategic Management', 'Capstone Project I'],
      2: ['ERP Systems', 'IT Risk Management', 'Change Management', 'Industry Immersion'],
    },
    '4': {
      1: ['Data Analytics', 'IS Strategy & Governance', 'Innovation Management', 'Capstone Project II'],
      2: ['Digital Transformation', 'IS Consulting', 'Entrepreneurship', 'Practicum'],
    },
  },
};

type Major = 'BSIT' | 'BSCS' | 'BSIS';
type Year = '1' | '2' | '3' | '4';
type Semester = 1 | 2;

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

  const getCourses = () => {
    if (!major || !year || !semester) return [];
    return coursesByMajor[major][year][semester];
  };

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

  const handleComplete = () => {
    // Save data to localStorage
    localStorage.setItem('major', major || '');
    localStorage.setItem('yearLevel', year || '');
    localStorage.setItem('semester', semester?.toString() || '');
    localStorage.setItem('courseRoles', JSON.stringify(courseRoles));
    
    const selectedCourses = Object.keys(courseRoles);
    localStorage.setItem('selectedCourses', JSON.stringify(selectedCourses));
    
    navigate('/app/community');
  };

  const canProceed = () => {
    if (step === 1) return major !== null;
    if (step === 2) return year !== null;
    if (step === 3) return semester !== null;
    if (step === 4) return Object.keys(courseRoles).length > 0;
    return false;
  };

  const courses = getCourses();

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
              
              <div className="space-y-2">
                {courses.map((course) => (
                  <div
                    key={course}
                    className={`rounded-lg border-2 p-4 transition-all ${
                      courseRoles[course]
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <h4 className="font-semibold text-base">{course}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => toggleCourseRole(course, 'mentee')}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            courseRoles[course] === 'mentee'
                              ? 'bg-green-500 text-white shadow-sm'
                              : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                          }`}
                        >
                          <UserPlus className="h-4 w-4" />
                          Mentee
                        </button>
                        <button
                          onClick={() => toggleCourseRole(course, 'mentor')}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            courseRoles[course] === 'mentor'
                              ? 'bg-green-600 text-white shadow-sm'
                              : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          Mentor
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

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
