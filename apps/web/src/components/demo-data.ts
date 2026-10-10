export type Role = "student" | "alumni" | "faculty";

export interface DemoPerson {
  id: string;
  name: string;
  role: "Student" | "Alumni" | "Faculty";
  university: string;
  major: string;
  skills: string[];
  wants: string[];
  about: string;
  availability: string;
  available: boolean;
  verification: string;
  talent: boolean;
  resume?: string;
}

export interface DemoProject {
  id: string;
  title: string;
  problem: string;
  audience: string;
  goal: string;
  deliverable: string;
  successCriteria: string;
  exclusions: string;
  needs: string[];
  contribution: string;
  stage: "Idea" | "Recruiting" | "In progress" | "Completed";
  university: string;
  commitment: string;
  meeting: string;
  owner: string;
}

export const UNIVERSITIES = [
  "Windmere University",
  "Fernbridge College",
  "Solstice Institute",
] as const;

export const ALL_SKILLS = [
  "Python",
  "React",
  "Data analysis",
  "UI design",
  "UX research",
  "Figma",
  "Writing",
  "Marketing",
  "Community research",
  "Project management",
  "Career mentoring",
  "Research",
  "Sustainability",
  "Data visualization",
  "Accessibility",
  "Prototyping",
] as const;

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    id: "maya",
    name: "Maya Chen",
    role: "Student",
    university: "Windmere University",
    major: "Computer Science",
    skills: ["Python", "React", "Data analysis"],
    wants: ["UI design", "Public speaking"],
    about:
      "I can turn a messy dataset into a useful story. Looking for design-minded teammates for a campus sustainability project.",
    availability: "2–4 hours / week",
    available: true,
    verification: "University email verified",
    talent: true,
    resume: "Python projects, data visualization, student volunteering.",
  },
  {
    id: "dev",
    name: "Dev Patel",
    role: "Student",
    university: "Fernbridge College",
    major: "Interaction Design",
    skills: ["UI design", "UX research", "Figma"],
    wants: ["React", "Accessibility"],
    about:
      "I design clear, approachable interfaces. I want to work with someone who can help bring a prototype to life.",
    availability: "2–4 hours / week",
    available: true,
    verification: "University email verified",
    talent: true,
    resume: "Interface prototypes, usability studies, accessible design coursework.",
  },
  {
    id: "nia",
    name: "Nia Brooks",
    role: "Alumni",
    university: "Solstice Institute",
    major: "Business Analytics",
    skills: ["Data analysis", "Career mentoring", "Project management"],
    wants: ["Community research"],
    about:
      "I help students turn a broad idea into a realistic first milestone. Happy to review project plans.",
    availability: "1 hour / week",
    available: true,
    verification: "Graduation self-reported",
    talent: false,
  },
  {
    id: "elena",
    name: "Dr. Elena Park",
    role: "Faculty",
    university: "Windmere University",
    major: "Environmental Engineering",
    skills: ["Research", "Sustainability", "Data visualization"],
    wants: [],
    about:
      "I advise student projects about environmental data and community impact. Member post — not institutional approval.",
    availability: "1 hour / week",
    available: true,
    verification: "Faculty role reviewed",
    talent: false,
  },
];

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "reuse",
    title: "Campus Reuse Map",
    problem: "Students cannot find places to repair, donate, and reuse everyday items.",
    audience: "Undergraduate students living on and near campus.",
    goal: "Ship a clear, accessible map prototype backed by a sample dataset.",
    deliverable: "Working map prototype plus documented dataset.",
    successCriteria: "10 testers complete a find-and-donate task without help.",
    exclusions: "No pickup logistics, no payment handling, no off-campus partnerships.",
    needs: ["UI design", "UX research"],
    contribution: "Python data pipeline and a first map prototype.",
    stage: "Recruiting",
    university: "Windmere University",
    commitment: "2–4 hours / week for 6 weeks",
    meeting: "Online",
    owner: "Maya Chen",
  },
  {
    id: "health",
    title: "Health, Clearly",
    problem: "Campus health guidance is hard to read and easy to misunderstand.",
    audience: "First-year students navigating campus health resources.",
    goal: "Create plain-language health information cards backed by public resources.",
    deliverable: "Set of 12 illustrated cards plus survey summary.",
    successCriteria: "Readability score at grade 8 or below on every card.",
    exclusions: "No medical advice, no diagnosis tools, no appointment booking.",
    needs: ["Data visualization", "Writing"],
    contribution: "Community interviews and public-health research.",
    stage: "Recruiting",
    university: "Windmere University",
    commitment: "2–4 hours / week for 5 weeks",
    meeting: "Online or in person",
    owner: "Sofia Reyes",
  },
  {
    id: "planner",
    title: "A Better Study Planner",
    problem: "Students juggling classes and part-time work lack an accessible planning tool.",
    audience: "Part-time working students at Fernbridge College.",
    goal: "Build the first working prototype from ready design screens.",
    deliverable: "Clickable prototype turned into a working weekly planner.",
    successCriteria: "5 students plan a full week in under 10 minutes.",
    exclusions: "No calendar sync, no notifications, no mobile app store release.",
    needs: ["React", "Accessibility"],
    contribution: "Wireframes and usability-testing plan.",
    stage: "In progress",
    university: "Fernbridge College",
    commitment: "2–4 hours / week for 8 weeks",
    meeting: "Online",
    owner: "Dev Patel",
  },
];

export type ApiEnvelope<T> = { data: T } | { error: { code: string; message: string } };

export function isDemoMode(): boolean {
  return (
    typeof process !== "undefined" &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function verificationLabel(v: string, demo: boolean): string {
  return demo ? `${v} · Demo` : v;
}
