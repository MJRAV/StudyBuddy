import { useState } from 'react';
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
import { Users, UserPlus } from 'lucide-react';

// Same course data structure
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
type Semester = '1' | '2';

interface CourseRoles {
  [course: string]: 'mentor' | 'mentee';
}

interface ManageCoursesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCourses: CourseRoles;
  onSave: (newCourses: CourseRoles) => void;
}

export function ManageCoursesDialog({ open, onOpenChange, currentCourses, onSave }: ManageCoursesDialogProps) {
  const [major, setMajor] = useState<Major>((localStorage.getItem('major') as Major) || 'BSIT');
  const [year, setYear] = useState<Year>((localStorage.getItem('yearLevel') as Year) || '1');
  const [semester, setSemester] = useState<Semester>((localStorage.getItem('semester') as Semester) || '1');
  const [tempCourses, setTempCourses] = useState<CourseRoles>(currentCourses);

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

  const handleSave = () => {
    onSave(tempCourses);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempCourses(currentCourses);
    onOpenChange(false);
  };

  const availableCourses = coursesByMajor[major]?.[year]?.[parseInt(semester) as 1 | 2] || [];

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

            {availableCourses.length > 0 ? (
              <div className="space-y-2">
                {availableCourses.map((course: string) => (
                  <div
                    key={course}
                    className={`rounded-lg border-2 p-4 transition-all ${
                      tempCourses[course]
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm mb-2">{course}</h5>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCourseRole(course, 'mentee')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                              tempCourses[course] === 'mentee'
                                ? 'bg-green-500 text-white shadow-sm'
                                : 'bg-gray-100 text-zinc-700 hover:bg-gray-200'
                            }`}
                          >
                            <UserPlus className="h-4 w-4" />
                            Mentee
                          </button>
                          <button
                            onClick={() => toggleCourseRole(course, 'mentor')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                              tempCourses[course] === 'mentor'
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                No courses available for this selection
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
