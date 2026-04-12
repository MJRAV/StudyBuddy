export const coursesByMajor = {
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
} as const;

export type Major = keyof typeof coursesByMajor;
export type Year = '1' | '2' | '3' | '4';
export type Semester = 1 | 2;

export function getCoursesFromCatalog(major: Major | null, year: Year | null, semester: Semester | null): string[] {
  if (!major || !year || !semester) {
    return [];
  }

  return [...coursesByMajor[major][year][semester]];
}
