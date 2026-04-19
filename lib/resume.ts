export type ResumeTemplate = "modern" | "professional" | "minimal";

export type RoleType =
  | "tech"
  | "management"
  | "finance"
  | "marketing"
  | "design"
  | "government"
  | "internship"
  | "fresher"
  | "experienced";

export type ResumeBasics = {
  fullName: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  location: string;
  relocate: string;
  targetRole: string;
  experienceYears: string;
  topSkills: string;
  biggestAchievement: string;
  professionalSummary: string;
  valueProposition: string;
};

export type EducationEntry = {
  degree: string;
  specialization: string;
  university: string;
  graduationYear: string;
  cgpa: string;
  coursework: string;
  achievements: string;
};

export type ExperienceEntry = {
  company: string;
  role: string;
  duration: string;
  teamSize: string;
  tools: string;
  responsibilities: string;
  measurableImpact: string;
};

export type ProjectEntry = {
  title: string;
  techStack: string;
  problem: string;
  contribution: string;
  outcome: string;
  github: string;
  liveLink: string;
};

export type ResumeSkills = {
  languages: string;
  frameworks: string;
  tools: string;
  databases: string;
  cloud: string;
  softSkills: string;
  spokenLanguages: string;
};

export type CertificationEntry = {
  name: string;
  organization: string;
  year: string;
  credentialLink: string;
};

export type AchievementEntry = {
  title: string;
  description: string;
};

export type ResumeData = ResumeBasics & {
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: ResumeSkills;
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
};

export type CompanyRecommendation = {
  companyName: string;
  logoUrl: string;
  roleMatch: number;
  recommendedRole: string;
  whyRecommended: string;
  applyUrl: string;
  jobSearchUrl: string;
  workMode: "Remote" | "Hybrid" | "Onsite";
  salaryRange?: string;
};

export type ResumeInsights = {
  atsScore: number;
  roleFitScore: number;
  shortlistChance: number;
  readability: number;
  keywordMatch: number;
  formattingScore: number;
  impactScore: number;
  strengthLevel: string;
  salaryReadinessBand: string;
  improvementPriority: string[];
  suggestions: string[];
  strengths: string[];
  weakSections: string[];
  missingSkills: string[];
  missingKeywords: string[];
  suggestedCertifications: string[];
  recommendedRoles: string[];
  recommendedCompanies: CompanyRecommendation[];
  analysisSummary: string;
  analysisEngine: "heuristics" | "openai+heuristics";
};

export type ResumeEditor = {
  onBasicChange: (field: keyof ResumeBasics, value: string) => void;
  onSkillChange: (field: keyof ResumeSkills, value: string) => void;
  onEducationChange: (index: number, field: keyof EducationEntry, value: string) => void;
  onExperienceChange: (index: number, field: keyof ExperienceEntry, value: string) => void;
  onProjectChange: (index: number, field: keyof ProjectEntry, value: string) => void;
  onCertificationChange: (
    index: number,
    field: keyof CertificationEntry,
    value: string,
  ) => void;
  onAchievementChange: (
    index: number,
    field: keyof AchievementEntry,
    value: string,
  ) => void;
};

export const roleOptions: { label: string; value: RoleType }[] = [
  { label: "Tech / Software Job", value: "tech" },
  { label: "Management / MBA", value: "management" },
  { label: "Finance", value: "finance" },
  { label: "Marketing", value: "marketing" },
  { label: "Design", value: "design" },
  { label: "Government", value: "government" },
  { label: "Internship", value: "internship" },
  { label: "Fresher", value: "fresher" },
  { label: "Experienced Professional", value: "experienced" },
];

export const templateOptions: { id: ResumeTemplate; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "professional", label: "Professional" },
  { id: "minimal", label: "Minimal" },
];

export const emptyBasics = (): ResumeBasics => ({
  fullName: "",
  phone: "",
  email: "",
  linkedin: "",
  github: "",
  location: "",
  relocate: "",
  targetRole: "",
  experienceYears: "",
  topSkills: "",
  biggestAchievement: "",
  professionalSummary: "",
  valueProposition: "",
});

export const emptyEducation = (): EducationEntry => ({
  degree: "",
  specialization: "",
  university: "",
  graduationYear: "",
  cgpa: "",
  coursework: "",
  achievements: "",
});

export const emptyExperience = (): ExperienceEntry => ({
  company: "",
  role: "",
  duration: "",
  teamSize: "",
  tools: "",
  responsibilities: "",
  measurableImpact: "",
});

export const emptyProject = (): ProjectEntry => ({
  title: "",
  techStack: "",
  problem: "",
  contribution: "",
  outcome: "",
  github: "",
  liveLink: "",
});

export const emptySkills = (): ResumeSkills => ({
  languages: "",
  frameworks: "",
  tools: "",
  databases: "",
  cloud: "",
  softSkills: "",
  spokenLanguages: "",
});

export const emptyCertification = (): CertificationEntry => ({
  name: "",
  organization: "",
  year: "",
  credentialLink: "",
});

export const emptyAchievement = (): AchievementEntry => ({
  title: "",
  description: "",
});

export const createEmptyResume = (): ResumeData => ({
  ...emptyBasics(),
  education: [emptyEducation()],
  experience: [emptyExperience()],
  projects: [emptyProject()],
  skills: emptySkills(),
  certifications: [emptyCertification()],
  achievements: [emptyAchievement()],
});

export const hasMeaningfulText = (value: string) => value.trim().length > 0;

export const entryHasContent = (entry: Record<string, string>) =>
  Object.values(entry).some((value) => hasMeaningfulText(value));

export const getVisibleEntries = <T extends Record<string, string>>(entries: T[]) =>
  entries.filter((entry) => entryHasContent(entry));

export const getResumeSummary = (data: ResumeData) => {
  if (hasMeaningfulText(data.professionalSummary)) {
    return data.professionalSummary.trim();
  }

  const segments = [
    data.experienceYears
      ? `${data.experienceYears} years of experience`
      : "Career-ready candidate",
    data.targetRole ? `targeting ${data.targetRole}` : "",
    data.topSkills ? `with strengths in ${data.topSkills}` : "",
    data.biggestAchievement ? `known for ${data.biggestAchievement}` : "",
    data.valueProposition || "",
  ];

  return segments
    .filter(Boolean)
    .join(", ")
    .replace(/\s+,/g, ",")
    .trim();
};

export const getDisplayName = (value: string, fallback: string) =>
  hasMeaningfulText(value) ? value : fallback;

const normalizeInlineText = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();

const splitIntoPoints = (value: string) =>
  value
    .split(/\r?\n|[.;]+/)
    .map((item) => normalizeInlineText(item.replace(/^[-*•]\s*/, "")))
    .filter(Boolean);

const limitWords = (value: string, maxWords: number) => {
  const words = normalizeInlineText(value).split(" ").filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
};

const limitCharacters = (value: string, maxLength: number) => {
  const normalized = normalizeInlineText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const uniqueText = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const summarizeSummary = (data: ResumeData) => {
  const candidates = uniqueText([
    ...splitIntoPoints(data.professionalSummary),
    ...splitIntoPoints(data.valueProposition),
    ...splitIntoPoints(data.biggestAchievement),
    getResumeSummary(data),
  ]);

  return limitCharacters(candidates.slice(0, 3).map((item) => limitWords(item, 16)).join(". "), 240);
};

const summarizeExperienceEntry = (entry: ExperienceEntry): ExperienceEntry => {
  const bullets = uniqueText([
    ...splitIntoPoints(entry.responsibilities),
    ...splitIntoPoints(entry.measurableImpact),
    ...splitIntoPoints(entry.tools).map((toolLine) => `Used ${toolLine}`),
  ])
    .slice(0, 3)
    .map((item) => limitWords(item, 18));

  return {
    ...entry,
    responsibilities: bullets.join("\n"),
    measurableImpact: "",
    tools: limitWords(entry.tools, 10),
    teamSize: "",
  };
};

const summarizeProjectEntry = (entry: ProjectEntry): ProjectEntry => {
  const highlights = uniqueText([
    ...splitIntoPoints(entry.problem),
    ...splitIntoPoints(entry.contribution),
    ...splitIntoPoints(entry.outcome),
  ])
    .slice(0, 2)
    .map((item) => limitWords(item, 16));

  return {
    ...entry,
    techStack: limitWords(entry.techStack, 10),
    problem: highlights[0] || "",
    contribution: highlights[1] || "",
    outcome: "",
  };
};

const compactSkillGroup = (value: string, maxItems: number) =>
  value
    .split(/[,\n|]+/)
    .map((item) => normalizeInlineText(item))
    .filter(Boolean)
    .slice(0, maxItems)
    .join(", ");

export const optimizeResumeForOnePage = (data: ResumeData): ResumeData => ({
  ...data,
  professionalSummary: summarizeSummary(data),
  valueProposition: "",
  biggestAchievement: "",
  topSkills: compactSkillGroup(data.topSkills, 6),
  experience: getVisibleEntries(data.experience)
    .slice(0, 3)
    .map(summarizeExperienceEntry),
  projects: getVisibleEntries(data.projects)
    .slice(0, 2)
    .map(summarizeProjectEntry),
  education: getVisibleEntries(data.education).slice(0, 2).map((entry) => ({
    ...entry,
    coursework: "",
    achievements: "",
  })),
  skills: {
    languages: compactSkillGroup(data.skills.languages, 4),
    frameworks: compactSkillGroup(data.skills.frameworks, 4),
    tools: compactSkillGroup(data.skills.tools, 4),
    databases: compactSkillGroup(data.skills.databases, 3),
    cloud: compactSkillGroup(data.skills.cloud, 3),
    softSkills: compactSkillGroup(data.skills.softSkills, 4),
    spokenLanguages: compactSkillGroup(data.skills.spokenLanguages, 3),
  },
  certifications: [],
  achievements: [],
});
